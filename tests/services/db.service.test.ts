import fs from 'fs';
import path from 'path';

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

describe('DatabaseService (integration)', () => {
  const dbFile = path.join(tmpDir, `test-db-${Date.now()}.db`);
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

  test('addVocab -> getVocabByLesson -> updateVocab -> deleteVocab', async () => {
    const svc = new DatabaseService(dbFile);

    const id = await svc.addVocab('lesson01', 'Haus', 'house');
    expect(typeof id).toBe('number');

    const rows = await svc.getVocabByLesson('lesson01');
    const found = rows.find((r: any) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.de).toBe('Haus');
    expect(found?.en).toBe('house');

    const updated = await svc.updateVocab(id, 'Haus-upd', 'house-upd');
    expect(updated).toBeGreaterThanOrEqual(0);

    const rows2 = await svc.getVocabByLesson('lesson01');
    const found2 = rows2.find((r: any) => r.id === id);
    expect(found2?.de).toBe('Haus-upd');

    const deleted = await svc.deleteVocab(id);
    expect(deleted).toBeGreaterThanOrEqual(0);

    await svc.close();
  });
});
