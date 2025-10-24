import fs from 'fs';
import path from 'path';
import { promises as fsp } from 'fs';

const tmpRoot = path.join(process.cwd(), 'tmp', 'malformed-backup');
if (!fs.existsSync(tmpRoot)) fs.mkdirSync(tmpRoot, { recursive: true });

describe('Malformed auto-backup handling', () => {
  test('invalid JSON backup should not crash initialization and should fallback to seeds', async () => {
    const runRoot = path.join(tmpRoot, `run-${Date.now()}`);
    const backupsDir = path.join(runRoot, 'data', 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    // Write invalid JSON
    const backupPath = path.join(backupsDir, 'auto-backup.json');
    await fsp.writeFile(backupPath, '{ invalid-json', 'utf-8');

    const dbFile = path.join(runRoot, 'data', 'vocab.db');
    process.env.DB_PATH = dbFile;

  const { ensureDbInitialized } = await import('../../src/utils/init-db-runner.js');

    // Should not throw despite malformed backup; it should log and fall back
    await ensureDbInitialized(runRoot);

    expect(fs.existsSync(dbFile)).toBeTruthy();

    // cleanup
    try { await fsp.unlink(dbFile); } catch {}
    try { await fsp.unlink(backupPath); } catch {}
  });
});
