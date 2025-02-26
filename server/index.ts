import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`, 'express');
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });

    // Handle graceful shutdown with timeouts
    const shutdown = async () => {
      log('Shutting down gracefully...', 'express');
      let shutdownTimeout = setTimeout(() => {
        log('Forced shutdown after timeout', 'express');
        process.exit(1);
      }, 10000); // Force shutdown after 10 seconds

      try {
        // Close HTTP server first to stop accepting new connections
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        log('HTTP server closed.', 'express');

        // Close database connections if pool exists
        if (pool) {
          await pool.end();
          log('Database connections closed.', 'postgres');
        }

        // Clear the timeout and exit cleanly
        clearTimeout(shutdownTimeout);
        log('Graceful shutdown completed.', 'express');
        process.exit(0);
      } catch (err) {
        const error = err as Error;
        log(`Error during shutdown: ${error.message}`, 'express');
        clearTimeout(shutdownTimeout);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    const error = err as Error;
    log(`Failed to start server: ${error.message}`, 'express');
    throw err;
  }
})();