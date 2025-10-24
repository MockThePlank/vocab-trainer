import express from 'express';
import { describe, test, expect } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const tmpDir = path.join(process.cwd(), 'tmp', 'routes');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

describe('lessons.routes', () => {
  test('POST /api/lessons creates a new lesson with auto-name and no file', async () => {
    const runRoot = path.join(tmpDir, `run-${Date.now()}`);
    fs.mkdirSync(path.join(runRoot, 'data'), { recursive: true });
    const dbFile = path.join(runRoot, 'data', 'vocab-routes.db');
    process.env.DB_PATH = dbFile;

  const { ensureDbInitialized } = await import('../../src/utils/init-db-runner.js');
  await ensureDbInitialized(runRoot);

  // Ensure auto-backups created by route go into the test run folder
  process.env.AUTO_BACKUP_DIR = path.join(runRoot, 'data', 'backups');
  fs.mkdirSync(process.env.AUTO_BACKUP_DIR, { recursive: true });

    // Build test app and mount router
    const app = express();
    app.use(express.json());

  const lessonsRouter = (await import('../../src/routes/lessons.routes.js')).default;
    app.use('/api/lessons', lessonsRouter);

    const resp = await request(app).post('/api/lessons').send({});
    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(resp.body.lesson).toHaveProperty('slug');

    // cleanup
    try { await fs.promises.unlink(dbFile); } catch {}
  });

  test('POST /api/lessons with uploaded JSON file creates entries', async () => {
    const runRoot = path.join(tmpDir, `run-${Date.now()}`);
    fs.mkdirSync(path.join(runRoot, 'data'), { recursive: true });
    const dbFile = path.join(runRoot, 'data', 'vocab-routes.db');
    process.env.DB_PATH = dbFile;

  const { ensureDbInitialized } = await import('../../src/utils/init-db-runner.js');
  await ensureDbInitialized(runRoot);

  // Make sure route-created auto-backup lands in a test folder
  process.env.AUTO_BACKUP_DIR = path.join(runRoot, 'data', 'backups');
  fs.mkdirSync(process.env.AUTO_BACKUP_DIR, { recursive: true });

    // prepare upload file with 3 pairs
    const uploadFile = path.join(runRoot, 'upload.json');
    const pairs = [
      { de: 'eins', en: 'one' },
      { de: 'zwei', en: 'two' },
      { de: 'drei', en: 'three' }
    ];
    await fs.promises.writeFile(uploadFile, JSON.stringify(pairs), 'utf-8');

    // Build test app and mount router
    const app = express();
  const lessonsRouter = (await import('../../src/routes/lessons.routes.js')).default;
    app.use('/api/lessons', lessonsRouter);

    const resp = await request(app)
      .post('/api/lessons')
      .attach('file', uploadFile);

    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(resp.body.lesson).toHaveProperty('slug');
    expect(resp.body.lesson.entry_count).toBeGreaterThanOrEqual(3);

    // cleanup
    try { await fs.promises.unlink(dbFile); } catch {}
    try { await fs.promises.unlink(uploadFile); } catch {}
  });
});
