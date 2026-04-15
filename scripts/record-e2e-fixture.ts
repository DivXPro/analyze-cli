import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);
const OPENCLI_TIMEOUT_MS = 60000;
const OPENCLI_MAX_BUFFER = 50 * 1024 * 1024;
const CLI_TIMEOUT_MS = 30000;
const CLI_MAX_BUFFER = 10 * 1024 * 1024;
const DAEMON_START_WAIT_MS = 1500;
const DAEMON_STOP_WAIT_MS = 500;

interface RecordOptions {
  platform: string;
  platformName: string;
  query: string;
  limit: number;
  outputDir: string;
  searchTemplate: string;
  commentsTemplate: string;
  mediaTemplate: string;
  noteIdField: string;
}

function parseArgs(): RecordOptions {
  const args = process.argv.slice(2);
  const getArg = (flag: string, fallback?: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : fallback;
  };

  const platform = getArg('--platform');
  if (!platform) {
    console.error('Usage: npx tsx scripts/record-e2e-fixture.ts --platform <id> --query <q> [options]');
    process.exit(1);
  }

  const limitRaw = getArg('--limit', '3') ?? '3';
  const limitParsed = parseInt(limitRaw, 10);
  const limit = Number.isNaN(limitParsed) ? 3 : limitParsed;

  return {
    platform,
    platformName: getArg('--platform-name', `${platform} (Recorded)`),
    query: getArg('--query', '上海美食'),
    limit,
    outputDir: getArg('--output', `test-data/recorded/${new Date().toISOString().slice(0, 10)}-${platform}-e2e`),
    // Default templates target Xiaohongshu (xhs) platform
    searchTemplate: getArg('--search-template', 'opencli xiaohongshu search {query} --limit {limit} -f json'),
    commentsTemplate: getArg('--comments-template', 'opencli xiaohongshu comments {note_id} --limit 20 -f json'),
    mediaTemplate: getArg('--media-template', 'opencli xiaohongshu download {note_id} --output downloads/xhs -f json'),
    noteIdField: getArg('--note-id-field', 'noteId'),
  };
}

async function runOpencli(template: string, vars: Record<string, string | number>): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
  let cmd = template;
  for (const [key, value] of Object.entries(vars)) {
    cmd = cmd.split(`{${key}}`).join(String(value));
  }
  const tokens = cmd.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { success: false, error: 'Empty opencli template' };
  }
  try {
    const { stdout, stderr } = await execFileAsync(tokens[0], tokens.slice(1), {
      timeout: OPENCLI_TIMEOUT_MS,
      maxBuffer: OPENCLI_MAX_BUFFER,
    });
    const trimmed = stdout.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return { success: true, data: [trimmed] };
    }
    if (Array.isArray(data)) {
      return { success: true, data };
    }
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const arr = ('data' in obj ? obj.data : 'items' in obj ? obj.items : [data]);
      return { success: true, data: Array.isArray(arr) ? arr : [arr] };
    }
    return { success: true, data: [data] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

function getExecProp(obj: unknown, key: 'stdout' | 'stderr'): string {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    const val = (obj as Record<string, unknown>)[key];
    return typeof val === 'string' ? val : '';
  }
  return '';
}

async function runAnalyzeCli(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  const cliPath = path.join(process.cwd(), 'dist/cli/index.js');
  if (!fs.existsSync(cliPath)) {
    throw new Error(`CLI not built: ${cliPath} missing. Run 'npm run build' first.`);
  }
  try {
    const { stdout, stderr } = await execFileAsync('node', [cliPath, ...args], {
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: CLI_MAX_BUFFER,
    });
    return { success: true, stdout, stderr };
  } catch (err: unknown) {
    const execErr = err instanceof Error ? err : new Error(String(err));
    return {
      success: false,
      stdout: getExecProp(err, 'stdout'),
      stderr: getExecProp(err, 'stderr'),
      error: execErr.message,
    };
  }
}

const DAEMON_PID_FILE = process.env.ANALYZE_CLI_DAEMON_PID || '/tmp/analyze-cli.pid';
const IPC_SOCKET_PATH = process.env.ANALYZE_CLI_IPC_SOCKET || '/tmp/analyze-cli.sock';

function isDaemonRunning(): boolean {
  if (!fs.existsSync(DAEMON_PID_FILE)) return false;
  try {
    const pid = parseInt(fs.readFileSync(DAEMON_PID_FILE, 'utf-8').trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function ensureDaemonStarted(): Promise<void> {
  if (isDaemonRunning()) {
    console.log('[record] Daemon already running');
    return;
  }
  console.log('[record] Starting daemon...');
  const result = await runAnalyzeCli(['daemon', 'start']);
  if (!result.success) {
    throw new Error(`Failed to start daemon: ${result.error}`);
  }
  await new Promise(r => setTimeout(r, DAEMON_START_WAIT_MS));
  if (!isDaemonRunning()) {
    throw new Error('Daemon did not start in time');
  }
  console.log('[record] Daemon started');
}

async function stopDaemon(): Promise<void> {
  if (!isDaemonRunning()) return;
  console.log('[record] Stopping daemon...');
  await runAnalyzeCli(['daemon', 'stop']);
  await new Promise(r => setTimeout(r, DAEMON_STOP_WAIT_MS));
}

async function main() {
  const opts = parseArgs();
  await fs.promises.mkdir(opts.outputDir, { recursive: true });
  console.log(`[record] Output dir: ${opts.outputDir}`);

  await ensureDaemonStarted();
  console.log('[record] Daemon ready');

  // --- Search posts ---
  console.log(`[record] Searching posts: "${opts.query}"`);
  const searchResult = await runOpencli(opts.searchTemplate, { query: opts.query, limit: opts.limit });
  if (!searchResult.success) {
    throw new Error(`Search failed: ${searchResult.error}`);
  }
  const postsRaw = searchResult.data ?? [];
  console.log(`[record] Found ${postsRaw.length} posts`);

  const postsRawFile = path.join(opts.outputDir, 'posts_raw.json');
  fs.writeFileSync(postsRawFile, JSON.stringify(postsRaw, null, 2));

  // Transform to import-compatible JSONL
  const postsForImport = postsRaw.map((item: any, idx: number) => ({
    ...item,
    platform_post_id: item[opts.noteIdField] ?? item.id ?? item.noteId ?? `post_${idx}`,
  }));
  const postsJsonlFile = path.join(opts.outputDir, 'posts_transformed.jsonl');
  fs.writeFileSync(postsJsonlFile, postsForImport.map(p => JSON.stringify(p)).join('\n') + '\n');

  // --- Create platform via CLI (if not already exists) ---
  const listPlatResult = await runAnalyzeCli(['platform', 'list']);
  const platformExists = listPlatResult.success && listPlatResult.stdout.includes(opts.platform);
  if (!platformExists) {
    console.log(`[record] Creating platform: ${opts.platform}`);
    const platResult = await runAnalyzeCli([
      'platform', 'add',
      '--id', opts.platform,
      '--name', opts.platformName,
      '--description', `Recorded from query: ${opts.query}`,
    ]);
    if (!platResult.success) {
      console.warn(`[record] Platform add warning: ${platResult.error ?? platResult.stderr}`);
    }
  } else {
    console.log(`[record] Platform ${opts.platform} already exists, skipping creation`);
  }

  // --- Import posts via CLI ---
  console.log(`[record] Importing posts via CLI...`);
  const importResult = await runAnalyzeCli([
    'post', 'import',
    '--platform', opts.platform,
    '--file', postsJsonlFile,
  ]);
  if (!importResult.success) {
    throw new Error(`Post import failed: ${importResult.error}`);
  }
  console.log(`[record] Post import stdout: ${importResult.stdout.trim()}`);

  // --- Retrieve imported posts via CLI ---
  const listResult = await runAnalyzeCli(['post', 'list', '--platform', opts.platform, '--limit', String(opts.limit)]);
  if (!listResult.success) {
    throw new Error(`Post list failed: ${listResult.error}`);
  }
  console.log(`[record] Post list stdout: ${listResult.stdout.trim()}`);
}

main().catch(err => {
  console.error('[record] Fatal error:', err);
  process.exit(1);
});
