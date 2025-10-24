import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import vocabRoutes from './src/routes/vocab.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import lessonsRoutes from './src/routes/lessons.routes.js';
import { dbService } from './src/services/db.service.js';
import { ensureDbInitialized } from './src/utils/init-db-runner.js';
import { ApiResponse } from './src/types/index.js';
import { logger } from './src/utils/logger.js';

dotenv.config();

// Validate required environment variables
if (!process.env.ADMIN_API_KEY) {
  logger.error('ADMIN_API_KEY environment variable is required');
  logger.error('Please set ADMIN_API_KEY in your .env file');
  logger.error('You can generate a secure key with: openssl rand -base64 32');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers with helmet.js
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for frontend
        scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, onchange)
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

app.use(express.json());

// CORS aktivieren
app.use(cors());

// Rate Limiting: Nur in Produktion aktivieren
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 100, // Limit pro IP
    skip: (req) => req.path === '/health', // Health Endpoint ausnehmen
    message: 'Zu viele Requests von dieser IP, bitte später versuchen.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  logger.info('Rate limiting enabled (production mode)');
} else {
  logger.info('Rate limiting disabled (development mode)');
}

// HTTPS erzwingen (für Produktion)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Routes
app.use('/api/vocab', vocabRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lessons', lessonsRoutes);

// Serve Vite build output (frontend)
const frontendPath = path.join(__dirname, 'frontend'); // dist/frontend
app.use(express.static(frontendPath));

// Health Check Endpoint für Render (must be reachable before SPA fallback)
app.get('/health', (req: Request, res: Response<ApiResponse>) => {
  res.status(200).json({ status: 'ok' });
});

// SPA fallback: serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).send('API route not found');
  }
});

// Graceful Shutdown
process.on('SIGINT', () => {
  void (async () => {
    try {
      await dbService.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  })();
});

process.on('SIGTERM', () => {
  void (async () => {
    try {
      await dbService.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  })();
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // Wichtig für Render!

async function start() {
  try {
    // Ensure DB is initialized before accepting requests (run everywhere)
    logger.info('Running DB initialization (start)');
    await ensureDbInitialized();

    app.listen(PORT, HOST, () => {
      logger.info('Vocab Trainer started', {
        port: PORT,
        host: HOST,
        appUrl: `http://${HOST}:${PORT}/index.html`,
        healthUrl: `http://${HOST}:${PORT}/health`,
        environment: process.env.NODE_ENV || 'development',
      });
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.error('Failed to initialize DB on start', { error: errMsg });
    process.exit(1);
  }
}

void start();