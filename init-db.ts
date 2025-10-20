import { ensureDbInitialized } from './src/utils/init-db-runner.js';
import { logger } from './src/utils/logger.js';

void (async () => {
  try {
    await ensureDbInitialized();
    process.exit(0);
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.error('Initialization failed', { error: errMsg });
    process.exit(1);
  }
})();