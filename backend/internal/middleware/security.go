package middleware

import (
	"net/http"
	"strings"
)

func Security(origins []string, next http.Handler) http.Handler {
	allowed := make(map[string]bool, len(origins))
	for _, origin := range origins { allowed[strings.TrimSpace(origin)] = true }
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && allowed[origin] { w.Header().Set("Access-Control-Allow-Origin", origin); w.Header().Add("Vary", "Origin"); w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); w.Header().Set("Access-Control-Allow-Headers", "Content-Type") }
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		next.ServeHTTP(w, r)
	})
}
