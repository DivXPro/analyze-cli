import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';

const CLI_PATH = path.join(process.cwd(), 'bin', 'analyze-cli.js');

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function getTestEnv(): Record<string, string> {
  const runId = `e2e_${Date.now()}_${process.pid}`;
  const tmpDir = path.join(os.tmpdir(), 'analyze-cli-e2e', runId);
  return {
    ...process.env,
    ANALYZE_CLI_DB_PATH: path.join(tmpDir, 'test.duckdb'),
    ANALYZE_CLI_IPC_SOCKET: path.join(tmpDir, 'daemon.sock'),
    ANALYZE_CLI_DAEMON_PID: path.join(tmpDir, 'daemon.pid'),
    ANALYZE_CLI_LOG_LEVEL: 'error',
  };
}

export async function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const env = getTestEnv();
    const proc = spawn('node', [CLI_PATH, ...args], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

export function extractId(stdout: string): string | null {
  // Matches patterns like:
  // "Task created: abc-123-def"
  // "Platform added: xhs_e2e_123"
  // "Strategy imported: strategy_abc"
  const match = stdout.match(/(?:created|added|imported):\s*([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function extractCount(stdout: string, label: string): number | null {
  const pattern = new RegExp(`${label}:\\s*(\\d+)`);
  const match = stdout.match(pattern);
  return match ? parseInt(match[1], 10) : null;
}
