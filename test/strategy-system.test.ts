import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../dist/db/client.js';
const { query, close: closeDb } = db;
import * as migrate from '../dist/db/migrate.js';
const { runMigrations } = migrate;

describe('strategy system', { timeout: 15000 }, () => {
  before(async () => {
    closeDb();
    await runMigrations();
  });

  it('should have strategies table', async () => {
    const rows = await query("SELECT table_name FROM information_schema.tables WHERE table_name = 'strategies'");
    assert.equal(rows.length, 1);
  });

  it('should have analysis_results table', async () => {
    const rows = await query("SELECT table_name FROM information_schema.tables WHERE table_name = 'analysis_results'");
    assert.equal(rows.length, 1);
  });

  it('should have queue_jobs.strategy_id column', async () => {
    const rows = await query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'queue_jobs' AND column_name = 'strategy_id'"
    );
    assert.equal(rows.length, 1);
  });
});
