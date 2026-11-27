package image

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Dragodui/diploma-server/internal/metrics"
)

// s7aRefPrefix marks a private file reference stored in the database: s7a://<bucket>/<key>
const s7aRefPrefix = "s7a://"

// privateLinkWindow: private links are valid until the end of the next window.
// Rounding keeps the same link for hours, so clients can cache images,
// and every link stays valid for at least one full window.
const privateLinkWindow = 12 * time.Hour

// S7AService stores images in a self-hosted s7a server.
// Public files go to a public bucket and get permanent links.
// Private files go to a private bucket; the database keeps s7a://<bucket>/<key>,
// and links are signed here locally with the s7a presign scheme (v1), so no request
// to s7a is needed to show an image.
type S7AService struct {
	apiURL        string // internal s7a address, e.g. http://s7a:6465
	apiKey        string
	publicURL     string // base of links for clients, e.g. https://api.example.com
	publicBucket  bucketInfo
	privateBucket bucketInfo
	signSecret    []byte
	http          *http.Client
}

type bucketInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// NewS7AService connects to s7a and creates the public and private buckets if missing.
func NewS7AService(ctx context.Context, apiURL, apiKey, publicURL, publicBucket, privateBucket string) (*S7AService, error) {
	if apiKey == "" {
		return nil, errors.New("s7a api key is required")
	}
	mac := hmac.New(sha256.New, []byte(apiKey))
	mac.Write([]byte("s7a-presign-v1"))

	s := &S7AService{
		apiURL:     strings.TrimSuffix(apiURL, "/"),
		apiKey:     apiKey,
		publicURL:  strings.TrimSuffix(publicURL, "/"),
		signSecret: mac.Sum(nil),
		http:       &http.Client{Timeout: 60 * time.Second},
	}

	var err error
	if s.publicBucket, err = s.ensureBucket(ctx, publicBucket, true); err != nil {
		return nil, err
	}
	if s.privateBucket, err = s.ensureBucket(ctx, privateBucket, false); err != nil {
		return nil, err
	}
	log.Printf("s7a configured: api=%s, public bucket=%s, private bucket=%s", s.apiURL, publicBucket, privateBucket)
	return s, nil
}

func (s *S7AService) do(ctx context.Context, method, path string, body io.Reader, contentType string, size int64) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, s.apiURL+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-API-KEY", s.apiKey)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if size > 0 {
		req.ContentLength = size
	}
	return s.http.Do(req)
}

// apiError reads s7a error body {"message": "..."}.
func apiError(resp *http.Response) error {
	var e struct {
		Message string `json:"message"`
	}
	_ = json.NewDecoder(io.LimitReader(resp.Body, 4096)).Decode(&e)
	return fmt.Errorf("s7a: %s: %s", resp.Status, e.Message)
}

// ensureBucket creates bucket (409 means it exists), sets its visibility and returns its id.
func (s *S7AService) ensureBucket(ctx context.Context, name string, public bool) (bucketInfo, error) {
	resp, err := s.do(ctx, http.MethodPut, "/api/buckets/"+url.PathEscape(name)+"?public="+strconv.FormatBool(public), nil, "", 0)
	if err != nil {
		return bucketInfo{}, fmt.Errorf("s7a: create bucket %s: %w", name, err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict {
		return bucketInfo{}, fmt.Errorf("s7a: create bucket %s: %s", name, resp.Status)
	}

	// bucket may already exist with other visibility, so set it explicitly
	body := strings.NewReader(fmt.Sprintf(`{"public": %t}`, public))
	resp, err = s.do(ctx, http.MethodPatch, "/api/buckets/"+url.PathEscape(name), body, "application/json", 0)
	if err != nil {
		return bucketInfo{}, fmt.Errorf("s7a: set bucket %s visibility: %w", name, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return bucketInfo{}, apiError(resp)
	}
	var b bucketInfo
	if err := json.NewDecoder(resp.Body).Decode(&b); err != nil {
		return bucketInfo{}, fmt.Errorf("s7a: decode bucket: %w", err)
	}
	return b, nil
}

func (s *S7AService) Upload(ctx context.Context, file multipart.File, header *multipart.FileHeader, visibility Visibility) (string, error) {
	contentType, key, err := validateUpload(file, header)
	if err != nil {
		return "", err
	}

	start := time.Now()
	err = s.PutObject(ctx, visibility, key, contentType, file, header.Size)
	metrics.S3UploadDuration.Observe(time.Since(start).Seconds())
	if err != nil {
		metrics.S3UploadsTotal.WithLabelValues("error").Inc()
		return "", err
	}
	metrics.S3UploadsTotal.WithLabelValues("success").Inc()
	metrics.S3UploadSizeBytes.Observe(float64(header.Size))
	log.Printf("Uploaded to s7a: %s (Size: %d bytes, Type: %s, visibility: %s)", key, header.Size, contentType, visibility)

	// private: client gets an openable link now; it is turned back into a reference on save
	return s.Resolve(s.StoredValue(visibility, key)), nil
}

// PutObject stores raw bytes under key without image validation (used by Upload and migrations).
func (s *S7AService) PutObject(ctx context.Context, visibility Visibility, key, contentType string, body io.Reader, size int64) error {
	bucket := s.bucket(visibility)
	resp, err := s.do(ctx, http.MethodPut, "/api/buckets/"+url.PathEscape(bucket.Name)+"/objects/"+escapeKey(key), body, contentType, size)
	if err != nil {
		return fmt.Errorf("failed to upload file to s7a: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		return apiError(resp)
	}
	return nil
}

// StoredValue is what the database keeps for a file: permanent link for public,
// s7a://<bucket>/<key> reference for private.
func (s *S7AService) StoredValue(visibility Visibility, key string) string {
	if visibility == Public {
		return s.publicLink(key)
	}
	return s7aRefPrefix + s.privateBucket.Name + "/" + key
}

func (s *S7AService) bucket(visibility Visibility) bucketInfo {
	if visibility == Public {
		return s.publicBucket
	}
	return s.privateBucket
}

// Delete removes a file by its link or stored reference. Links of other storages are ignored.
func (s *S7AService) Delete(ctx context.Context, imageURL string) error {
	bucket, key, ok := s.parse(imageURL)
	if !ok {
		log.Printf("s7a: skip delete of foreign file %q", imageURL)
		return nil
	}
	resp, err := s.do(ctx, http.MethodDelete, "/api/buckets/"+url.PathEscape(bucket.Name)+"/objects/"+escapeKey(key), nil, "", 0)
	if err != nil {
		return fmt.Errorf("failed to delete file from s7a: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		return apiError(resp)
	}
	return nil
}

// GetPresignedURL returns a link to a private file valid for expiration.
func (s *S7AService) GetPresignedURL(_ context.Context, key string, expiration time.Duration) (string, error) {
	return s.signedLink(s.privateBucket.ID, key, time.Now().Add(expiration).Unix()), nil
}

// Resolve implements models.FileURLResolver: s7a://<private bucket>/<key> becomes a signed link.
func (s *S7AService) Resolve(stored string) string {
	rest, ok := strings.CutPrefix(stored, s7aRefPrefix)
	if !ok {
		return stored
	}
	bucketName, key, ok := strings.Cut(rest, "/")
	if !ok || bucketName != s.privateBucket.Name {
		return stored
	}
	window := int64(privateLinkWindow.Seconds())
	exp := (time.Now().Unix()/window + 2) * window
	return s.signedLink(s.privateBucket.ID, key, exp)
}

// Normalize implements models.FileURLResolver: our signed link to a private file
// becomes s7a://<bucket>/<key>. Everything else is stored as is.
func (s *S7AService) Normalize(link string) string {
	bucket, key, ok := s.parse(link)
	if !ok || bucket.ID != s.privateBucket.ID {
		return link
	}
	return s7aRefPrefix + bucket.Name + "/" + key
}

// parse finds bucket and key in a reference, a signed link or a public link of this storage.
func (s *S7AService) parse(link string) (bucketInfo, string, bool) {
	if rest, ok := strings.CutPrefix(link, s7aRefPrefix); ok {
		name, key, ok := strings.Cut(rest, "/")
		switch {
		case !ok:
		case name == s.privateBucket.Name:
			return s.privateBucket, key, true
		case name == s.publicBucket.Name:
			return s.publicBucket, key, true
		}
		return bucketInfo{}, "", false
	}

	u, err := url.Parse(link)
	if err != nil {
		return bucketInfo{}, "", false
	}
	base, err := url.Parse(s.publicURL)
	if err != nil || u.Host != base.Host {
		return bucketInfo{}, "", false
	}
	path := strings.TrimPrefix(u.Path, strings.TrimSuffix(base.Path, "/"))
	for prefix, bucket := range map[string]bucketInfo{
		"/p/" + s.privateBucket.ID + "/":     s.privateBucket,
		"/public/" + s.publicBucket.ID + "/": s.publicBucket,
	} {
		if key, ok := strings.CutPrefix(path, prefix); ok && key != "" {
			return bucket, key, true
		}
	}
	return bucketInfo{}, "", false
}

func (s *S7AService) publicLink(key string) string {
	return s.publicURL + "/public/" + s.publicBucket.ID + "/" + escapeKey(key)
}

// signedLink builds an s7a presigned link (scheme v1, see s7a internal/presign).
func (s *S7AService) signedLink(bucketID, key string, exp int64) string {
	mac := hmac.New(sha256.New, s.signSecret)
	mac.Write([]byte("GET\n" + bucketID + "\n" + strconv.FormatInt(exp, 10) + "\n" + key))
	q := url.Values{}
	q.Set("exp", strconv.FormatInt(exp, 10))
	q.Set("sig", hex.EncodeToString(mac.Sum(nil)))
	return s.publicURL + "/p/" + bucketID + "/" + escapeKey(key) + "?" + q.Encode()
}

// escapeKey escapes each path segment of key, keeping '/'.
func escapeKey(key string) string {
	segments := strings.Split(key, "/")
	for i, seg := range segments {
		segments[i] = url.PathEscape(seg)
	}
	return strings.Join(segments, "/")
}
