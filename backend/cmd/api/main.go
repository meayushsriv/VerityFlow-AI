package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/verityflow-ai/verityflow/internal/config"
	"github.com/verityflow-ai/verityflow/internal/handlers"
	"github.com/verityflow-ai/verityflow/internal/storage"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg := config.Load()
	store := storage.NewDemoStore()
	api := handlers.New(store, logger, cfg.GeminiModel)
	server := &http.Server{Addr: ":" + cfg.Port, Handler: api.Router(cfg.CORSOrigins), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 20}

	go func() {
		logger.Info("API listening", "port", cfg.Port, "demo_mode", true)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("shutdown failed", "error", err)
	}
}
