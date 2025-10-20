import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import vocabRoutes from './src/routes/vocab.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import { dbService } from './src/services/db.service.js';
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

// Rate Limiting: 100 Requests pro 15 Minuten pro IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Limit pro IP
  message: 'Zu viele Requests von dieser IP, bitte später versuchen.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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

// Serve Vite build output (frontend)
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).send('API route not found');
  }
});

// Health Check Endpoint für Render
app.get('/health', (req: Request, res: Response<ApiResponse>) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(PORT, HOST, () => {
  logger.info('Vocab Trainer started', {
    port: PORT,
    host: HOST,
    appUrl: `http://${HOST}:${PORT}/vocab.html`,
    healthUrl: `http://${HOST}:${PORT}/health`,
    environment: process.env.NODE_ENV || 'development',
  });
});