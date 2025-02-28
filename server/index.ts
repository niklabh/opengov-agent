import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getDb } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug logging for critical environment variables
log('Checking critical environment variables...', 'express');
log(`OpenAI API Key exists: ${!!process.env.OPENAI_API_KEY}`, 'express');
log(`Agent Seed Phrase exists: ${!!process.env.AGENT_SEED_PHRASE}`, 'express');
log(`Database URL exists: ${!!process.env.DATABASE_URL}`, 'express');

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
    log('Initializing database...', 'sqlite');
    await getDb();
    log('Database initialized successfully', 'sqlite');

    log('Setting up server routes...', 'express');
    const server = await registerRoutes(app);
    log('Routes registered successfully', 'express');

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
      log(`server started on port ${port}`);
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

    // Register shutdown handlers directly on the global process object
    if (typeof process !== 'undefined') {
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    }

  } catch (err) {
    const error = err as Error;
    log(`Failed to start server: ${error.message}`, 'express');
    throw err;
  }
})();