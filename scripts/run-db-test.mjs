#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const dbFile = path.join(tmpDir, `test-db-${Date.now()}.db`);
    process.env.DB_PATH = dbFile;

    // Build artifacts must exist (dist). Import compiled modules.
    const { ensureDbInitialized } = await import(path.join(process.cwd(), 'dist', 'src', 'utils', 'init-db-runner.js'));
    const { DatabaseService } = await import(path.join(process.cwd(), 'dist', 'src', 'services', 'db.service.js'));

    console.log('Initializing test DB at', dbFile);
    await ensureDbInitialized(process.cwd());

    const svc = new DatabaseService(dbFile);

    console.log('Adding vocab...');
    const id = await svc.addVocab('lesson01', 'Haus', 'house');
    console.log('Added id=', id);

    const rows = await svc.getVocabByLesson('lesson01');
    console.log('Row count for lesson01:', rows.length);

    console.log('Updating vocab id=', id);
    await svc.updateVocab(id, 'Haus-upd', 'house-upd');

    const rows2 = await svc.getVocabByLesson('lesson01');
    const found = rows2.find(r => r.id === id);
    console.log('Updated entry:', found);

    console.log('Deleting vocab id=', id);
    await svc.deleteVocab(id);

    await svc.close();

    // cleanup
    try { await fs.promises.unlink(dbFile); } catch { /* ignore */ }
    console.log('Test DB run completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Test run failed', err);
    process.exit(2);
  }
}

run();
