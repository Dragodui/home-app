package router

import (
	"log"
	"net/http/httputil"
	"net/url"

	"github.com/go-chi/chi/v5"
)

// mountStorageProxy forwards file links (/p/... signed, /public/...) to s7a,
// so files are served from the API domain and s7a itself stays private.
// Only GET and HEAD are forwarded; s7a checks signatures and bucket visibility.
func mountStorageProxy(r chi.Router, s7aURL string) {
	target, err := url.Parse(s7aURL)
	if err != nil {
		log.Fatalf("invalid S7A_URL: %v", err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	// stream big files without buffering
	proxy.FlushInterval = -1

	for _, prefix := range []string{"/p/*", "/public/*"} {
		r.Get(prefix, proxy.ServeHTTP)
		r.Head(prefix, proxy.ServeHTTP)
	}
}
