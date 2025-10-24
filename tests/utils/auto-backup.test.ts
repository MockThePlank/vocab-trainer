import fs from 'fs';
import path from 'path';
import { promises as fsp } from 'fs';

const tmpRoot = path.join(process.cwd(), 'tmp', 'auto-backup');
if (!fs.existsSync(tmpRoot)) fs.mkdirSync(tmpRoot, { recursive: true });

describe('Auto-backup create & restore', () => {
  test('createAutoBackup writes a file with lessons and vocabulary', async () => {
    const runRoot = path.join(tmpRoot, `run-${Date.now()}`);
    const backupsDir = path.join(runRoot, 'data', 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    const dbFile = path.join(runRoot, 'data', 'vocab.db');
    process.env.DB_PATH = dbFile;

    // Initialize DB using init runner (source module)
    const { ensureDbInitialized } = await import('../../src/utils/init-db-runner.js');
    await ensureDbInitialized(runRoot);

    const { createAutoBackup } = await import('../../src/utils/auto-backup.js');

    // createAutoBackup writes to process.cwd()/data/backups — run it inside runRoot
    const originalCwd = process.cwd();
    try {
      process.chdir(runRoot);
      await createAutoBackup();

      const backupPath = path.join(runRoot, 'data', 'backups', 'auto-backup.json');
      expect(fs.existsSync(backupPath)).toBeTruthy();

      const raw = await fsp.readFile(backupPath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed).toHaveProperty('lessons');
      expect(Array.isArray(parsed.lessons)).toBe(true);
      expect(parsed).toHaveProperty('vocabulary');
      expect(Array.isArray(parsed.vocabulary)).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }

    // cleanup DB file
    try { await fsp.unlink(dbFile); } catch {}
  });
});
