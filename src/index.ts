import compression from 'compression';
import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, InlineConfig, ViteDevServer } from 'vite';
import serveStatic from 'serve-static';
import { loadConfig, paths } from './backend/config.js';
import { createApiRouter } from './backend/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveFrontendPath = (...subPath: string[]) =>
  path.resolve(__dirname, 'frontend', ...subPath);

const ensureViteServer = async (env: string): Promise<ViteDevServer | null> => {
  if (env !== 'development') {
    return null;
  }
  const viteConfig: InlineConfig = {
    server: { middlewareMode: true },
    appType: 'custom',
    configFile: path.resolve(paths.projectRoot, 'vite.config.ts')
  };
  return createViteServer(viteConfig);
};

const createExpressApp = async () => {
  const config = loadConfig();
  const app = express();

  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  const vite = await ensureViteServer(config.env);

  if (vite) {
    app.use(vite.middlewares);
  } else {
    const clientDist = path.resolve(paths.projectRoot, 'dist', 'client');
    app.use(
      serveStatic(clientDist, {
        index: false
      })
    );
  }

  app.use('/api', createApiRouter(config));

  if (vite) {
    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const indexPath = resolveFrontendPath('index.html');
        const template = await fs.readFile(indexPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(url, template);
        res.status(200).setHeader('Content-Type', 'text/html').end(transformed);
      } catch (error) {
        vite.ssrFixStacktrace(error as Error);
        next(error);
      }
    });
  } else {
    const clientDist = path.resolve(paths.projectRoot, 'dist', 'client');
    const indexPath = path.join(clientDist, 'index.html');
    app.use('*', async (_req, res, next) => {
      try {
        const template = await fs.readFile(indexPath, 'utf-8');
        res.status(200).setHeader('Content-Type', 'text/html').end(template);
      } catch (error) {
        next(error);
      }
    });
  }

  return { app, config };
};

const listenWithRetry = (server: http.Server, startPort: number, host: string, maxAttempts = 10) =>
  new Promise<{ port: number }>((resolve, reject) => {
    let attempts = 0;
    const attempt = (port: number) => {
      const handleError = (error: NodeJS.ErrnoException) => {
        server.removeListener('listening', handleListening);
        if (error.code === 'EADDRINUSE' && attempts < maxAttempts) {
          attempts += 1;
          attempt(port + 1);
        } else {
          reject(error);
        }
      };

      const handleListening = () => {
        server.removeListener('error', handleError);
        resolve({ port });
      };

      server.once('error', handleError);
      server.once('listening', handleListening);
      server.listen(port, host);
    };

    attempt(startPort);
  });

const bootstrap = async () => {
  const { app, config } = await createExpressApp();
  const server = http.createServer(app);

  try {
    const { port } = await listenWithRetry(server, config.port, config.host);
    const actualHost = config.host === '0.0.0.0' ? 'localhost' : config.host;
    // eslint-disable-next-line no-console
    console.log(`Codex WebApp listening on http://${actualHost}:${port} (${config.env})`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    // eslint-disable-next-line no-console
    console.log(`\nReceived ${signal}, shutting down...`);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

bootstrap();
