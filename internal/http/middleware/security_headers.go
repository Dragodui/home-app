package middleware

import (
	"net/http"
)

// SecurityHeaders adds security-related HTTP headers to responses
// These headers protect against common web vulnerabilities
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"font-src 'self' data: https://fonts.gstatic.com; "+
				"img-src 'self' data: blob: https://*.s3.amazonaws.com; "+
				"connect-src 'self' wss: https:; "+
				"worker-src 'self'; "+
				"manifest-src 'self'")
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=(self)")
		w.Header().Set("Cross-Origin-Embedder-Policy", "credentialless")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
		w.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		next.ServeHTTP(w, r)
	})
}
