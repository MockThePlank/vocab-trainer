import fs from 'fs';
import path from 'path';
import { promises as fsp } from 'fs';

const tmpRootBase = path.join(process.cwd(), 'tmp', 'init-runner');
if (!fs.existsSync(tmpRootBase)) fs.mkdirSync(tmpRootBase, { recursive: true });

describe('init-db-runner Variant A', () => {
  test('restores from auto-backup when DB missing', async () => {
    const runRoot = path.join(tmpRootBase, `restore-${Date.now()}`);
    fs.mkdirSync(path.join(runRoot, 'data', 'backups'), { recursive: true });

    // Create a minimal auto-backup
    const backup = {
      lessons: [{ slug: 'lesson01', title: 'Lektion 01', entry_count: 1, created_at: new Date().toISOString() }],
      vocabulary: [{ lesson: 'lesson01', de: 'Haus', en: 'house' }]
    };

    const backupPath = path.join(runRoot, 'data', 'backups', 'auto-backup.json');
    await fsp.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf-8');

    const dbFile = path.join(runRoot, 'data', 'vocab-test.db');
    process.env.DB_PATH = dbFile;

    const { ensureDbInitialized } = await import('../../src/utils/init-db-runner.js');

    await ensureDbInitialized(runRoot);

    // Verify DB file created
    expect(fs.existsSync(dbFile)).toBeTruthy();

    // Clean up
    try { await fsp.unlink(dbFile); } catch {}
    try { await fsp.unlink(backupPath); } catch {}
  });

  test('falls back to seed files when no backup present', async () => {
    const runRoot = path.join(tmpRootBase, `seed-${Date.now()}`);
    fs.mkdirSync(path.join(runRoot, 'data'), { recursive: true });

    // Copy or write a minimal seed file for lesson01
    const seed = [{ de: 'Baum', en: 'tree' }];
    const seedPath = path.join(runRoot, 'data', 'vocab-lesson01.json');
    await fsp.writeFile(seedPath, JSON.stringify(seed, null, 2), 'utf-8');

    const dbFile = path.join(runRoot, 'data', 'vocab-test.db');
    process.env.DB_PATH = dbFile;

    const { ensureDbInitialized } = await import('../../src/utils/init-db-runner.js');

    await ensureDbInitialized(runRoot);

    expect(fs.existsSync(dbFile)).toBeTruthy();

    // Clean up
    try { await fsp.unlink(dbFile); } catch {}
    try { await fsp.unlink(seedPath); } catch {}
  });
});
