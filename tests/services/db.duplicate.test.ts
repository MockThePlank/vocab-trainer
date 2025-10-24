import fs from 'fs';
import path from 'path';

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

describe('DatabaseService duplicate handling', () => {
  const dbFile = path.join(tmpDir, `dup-db-${Date.now()}.db`);
  let DatabaseService: any;
  let ensureDbInitialized: (root?: string) => Promise<void>;

  beforeAll(async () => {
    process.env.DB_PATH = dbFile;
  ({ ensureDbInitialized } = await import('../../src/utils/init-db-runner.js'));
  ({ DatabaseService } = await import('../../src/services/db.service.js'));
    await ensureDbInitialized(process.cwd());
  });

  afterAll(async () => {
    try { await fs.promises.unlink(dbFile); } catch { }
  });

  test('inserting duplicate vocab should raise constraint error', async () => {
    const svc = new DatabaseService(dbFile);

    const id1 = await svc.addVocab('lesson01', 'Haus', 'house');
    expect(typeof id1).toBe('number');

    // Second insert with same lesson,de,en should fail due to UNIQUE constraint
    await expect(svc.addVocab('lesson01', 'Haus', 'house')).rejects.toThrow();

    await svc.close();
  });
});
