package image_test

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"strings"
	"sync"
	"testing"

	imagemod "github.com/Dragodui/diploma-server/internal/modules/image"
	"github.com/stretchr/testify/require"
)

// fakeS7A imitates the s7a endpoints used by S7AService.
type fakeS7A struct {
	mu      sync.Mutex
	objects map[string][]byte // "<bucket>/<key>" -> body
	public  map[string]bool   // bucket -> public
}

func newFakeS7A(t *testing.T) (*fakeS7A, *httptest.Server) {
	f := &fakeS7A{objects: map[string][]byte{}, public: map[string]bool{}}
	srv := httptest.NewServer(http.HandlerFunc(f.serve))
	t.Cleanup(srv.Close)
	return f, srv
}

func (f *fakeS7A) serve(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-API-KEY") != "test-key" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	f.mu.Lock()
	defer f.mu.Unlock()

	path := strings.TrimPrefix(r.URL.Path, "/api/buckets/")
	bucket, rest, hasObject := strings.Cut(path, "/objects/")
	switch {
	case !hasObject && r.Method == http.MethodPut:
		w.WriteHeader(http.StatusCreated)
	case !hasObject && r.Method == http.MethodPatch:
		var body struct{ Public bool }
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.public[bucket] = body.Public
		_ = json.NewEncoder(w).Encode(map[string]any{"id": bucket + "-id", "name": bucket, "public": body.Public})
	case hasObject && r.Method == http.MethodPut:
		data, _ := io.ReadAll(r.Body)
		f.objects[bucket+"/"+rest] = data
		w.WriteHeader(http.StatusCreated)
	case hasObject && r.Method == http.MethodDelete:
		delete(f.objects, bucket+"/"+rest)
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

// pngUpload returns a real PNG as multipart file, so it passes image validation.
func pngUpload(t *testing.T) (multipart.File, *multipart.FileHeader) {
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{255, 0, 0, 255})
	var data bytes.Buffer
	require.NoError(t, png.Encode(&data, img))

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	h := textproto.MIMEHeader{}
	h.Set("Content-Disposition", `form-data; name="image"; filename="pic.png"`)
	h.Set("Content-Type", "image/png")
	part, err := w.CreatePart(h)
	require.NoError(t, err)
	_, err = part.Write(data.Bytes())
	require.NoError(t, err)
	require.NoError(t, w.Close())

	form, err := multipart.NewReader(&body, w.Boundary()).ReadForm(1 << 20)
	require.NoError(t, err)
	header := form.File["image"][0]
	file, err := header.Open()
	require.NoError(t, err)
	t.Cleanup(func() { file.Close() })
	return file, header
}

func TestS7AService_PublicAndPrivateUpload(t *testing.T) {
	fake, srv := newFakeS7A(t)
	ctx := context.Background()

	svc, err := imagemod.NewS7AService(ctx, srv.URL, "test-key", "https://api.example.com", "home-public", "home-private")
	require.NoError(t, err)
	require.True(t, fake.public["home-public"])
	require.False(t, fake.public["home-private"])

	t.Run("public upload returns permanent link", func(t *testing.T) {
		file, header := pngUpload(t)
		link, err := svc.Upload(ctx, file, header, imagemod.Public)
		require.NoError(t, err)
		require.True(t, strings.HasPrefix(link, "https://api.example.com/public/home-public-id/"), link)
		require.True(t, strings.HasSuffix(link, ".png"), link)
		// public links are stored as they are
		require.Equal(t, link, svc.Normalize(link))
		require.Equal(t, link, svc.Resolve(link))
	})

	t.Run("private upload returns signed link stored as reference", func(t *testing.T) {
		file, header := pngUpload(t)
		link, err := svc.Upload(ctx, file, header, imagemod.Private)
		require.NoError(t, err)
		require.True(t, strings.HasPrefix(link, "https://api.example.com/p/home-private-id/"), link)
		require.Contains(t, link, "exp=")
		require.Contains(t, link, "sig=")

		ref := svc.Normalize(link)
		require.True(t, strings.HasPrefix(ref, "s7a://home-private/"), ref)
		require.True(t, strings.HasSuffix(ref, ".png"), ref)

		// reference resolves to the same stable link inside one window
		require.Equal(t, link, svc.Resolve(ref))
		// normalize is idempotent
		require.Equal(t, ref, svc.Normalize(ref))

		require.NoError(t, svc.Delete(ctx, link))
		require.Empty(t, fake.objects["home-private/"+strings.TrimPrefix(ref, "s7a://home-private/")])
	})

	t.Run("foreign links pass through", func(t *testing.T) {
		for _, link := range []string{
			"https://pub-123.r2.dev/old.jpg",
			"https://lh3.googleusercontent.com/a/avatar",
			"https://evil.example.com/p/home-private-id/x.png?exp=1&sig=00",
			"s7a://other-bucket/x.png",
		} {
			require.Equal(t, link, svc.Normalize(link))
			require.Equal(t, link, svc.Resolve(link))
			require.NoError(t, svc.Delete(ctx, link))
		}
	})

	t.Run("bad visibility is rejected", func(t *testing.T) {
		_, err := imagemod.ParseVisibility("everyone")
		require.Error(t, err)
		v, err := imagemod.ParseVisibility("")
		require.NoError(t, err)
		require.Equal(t, imagemod.Private, v)
	})
}

// TestS7AService_RealServer runs against a real s7a, to prove the links signed here
// are accepted by s7a. Run: S7A_TEST_URL=http://localhost:6465 S7A_TEST_KEY=<key> go test ./tests/modules/image -run RealServer
func TestS7AService_RealServer(t *testing.T) {
	apiURL, key := os.Getenv("S7A_TEST_URL"), os.Getenv("S7A_TEST_KEY")
	if apiURL == "" || key == "" {
		t.Skip("S7A_TEST_URL and S7A_TEST_KEY are not set")
	}
	ctx := context.Background()
	svc, err := imagemod.NewS7AService(ctx, apiURL, key, apiURL, "test-public", "test-private")
	require.NoError(t, err)

	get := func(link string) int {
		resp, err := http.Get(link)
		require.NoError(t, err)
		resp.Body.Close()
		return resp.StatusCode
	}

	file, header := pngUpload(t)
	private, err := svc.Upload(ctx, file, header, imagemod.Private)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, get(private), "signed link must be accepted by s7a")
	require.Equal(t, http.StatusOK, get(svc.Resolve(svc.Normalize(private))))
	require.Equal(t, http.StatusForbidden, get(strings.Replace(private, "sig=", "sig=00", 1)))

	file, header = pngUpload(t)
	public, err := svc.Upload(ctx, file, header, imagemod.Public)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, get(public))

	require.NoError(t, svc.Delete(ctx, private))
	require.NoError(t, svc.Delete(ctx, public))
	require.Equal(t, http.StatusForbidden, get(private))
	require.Equal(t, http.StatusNotFound, get(public))
}
