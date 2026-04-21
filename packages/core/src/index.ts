// === Database ===
export {
  getDbPath,
  getConnection,
  query,
  run,
  exec,
  checkpoint,
  close,
} from './db/client';

export { migrate } from './db/migrate';
export { seedPlatforms } from './db/seed';

export * from './db/posts';
export * from './db/comments';
export * from './db/platforms';
export * from './db/media-files';
export * from './db/field-mappings';
export * from './db/templates';
export * from './db/tasks';
export * from './db/task-targets';
export * from './db/task-steps';
export * from './db/task-post-status';
export * from './db/strategies';
export * from './db/queue-jobs';
export * from './db/analysis-results';
export * from './db/aggregation';

// === Config ===
export { loadConfig, config } from './config';
export { loadClaudeConfig } from './config/claude-config';

// === Shared Types ===
export * from './shared/types';
export * from './shared/constants';
export * from './shared/utils';
export { getLogger } from './shared/logger';
export { addShutdownHook, gracefulShutdown } from './shared/shutdown';
export { VERSION as version } from './shared/version';
export { emitJobEvent, onJobEvent } from './shared/job-events';
export { getDaemonStatus, setDaemonStatus } from './shared/daemon-status';

// === Data Fetcher ===
export { fetchViaOpencli } from './data-fetcher/opencli';
