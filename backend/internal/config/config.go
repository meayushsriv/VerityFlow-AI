package config

import (
	"os"
	"strings"
)

type Config struct {
	Port        string
	CORSOrigins []string
	GeminiModel string
}

func Load() Config {
	return Config{
		Port:        value("PORT", "8080"),
		CORSOrigins: split(value("CORS_ORIGINS", "http://localhost:5173")),
		GeminiModel: value("GEMINI_MODEL", "gemini-2.5-flash"),
	}
}

func value(key, fallback string) string {
	if result := strings.TrimSpace(os.Getenv(key)); result != "" {
		return result
	}
	return fallback
}

func split(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
