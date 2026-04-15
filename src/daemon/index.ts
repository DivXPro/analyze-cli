import { IpcServer } from './ipc-server';
import { getHandlers } from './handlers';
import { runConsumer } from '../worker/consumer';
import { runMigrations } from '../db/migrate';
import { seedAll } from '../db/seed';
import { close } from '../db/client';
import { IPC_SOCKET_PATH, DEFAULT_WORKERS } from '../shared/constants';
import { config } from '../config';
import * as fs from 'fs';

export class Daemon {
  private ipcServer: IpcServer;

  constructor() {
    const handlers = getHandlers();
    this.ipcServer = new IpcServer(async (method, params) => {
      const handler = handlers[method];
      if (!handler) throw new Error(`Unknown method: ${method}`);
      return handler(params);
    });
  }

  async start(): Promise<void> {
    await runMigrations();
    await seedAll();
    await this.ipcServer.start();

    const concurrency = config.worker.concurrency ?? DEFAULT_WORKERS;
    for (let i = 0; i < concurrency; i++) {
      runConsumer(i).catch((err) => {
        console.error(`[Worker-${i}] Fatal error:`, err);
      });
    }

    writePid();
    console.log('[Daemon] Started on', IPC_SOCKET_PATH);
  }

  stop(): void {
    this.ipcServer.stop();
    close();
    removePid();
    console.log('[Daemon] Stopped');
  }
}

function writePid(): void {
  const { DAEMON_PID_FILE } = require('../shared/constants');
  fs.writeFileSync(DAEMON_PID_FILE, String(process.pid));
}

function readPid(): number | null {
  const { DAEMON_PID_FILE } = require('../shared/constants');
  if (!fs.existsSync(DAEMON_PID_FILE)) return null;
  const pid = parseInt(fs.readFileSync(DAEMON_PID_FILE, 'utf-8').trim(), 10);
  return isNaN(pid) ? null : pid;
}

function removePid(): void {
  const { DAEMON_PID_FILE } = require('../shared/constants');
  if (fs.existsSync(DAEMON_PID_FILE)) {
    fs.unlinkSync(DAEMON_PID_FILE);
  }
}

if (require.main === module) {
  const daemon = new Daemon();
  daemon.start().catch(console.error);
  process.on('SIGINT', () => daemon.stop());
  process.on('SIGTERM', () => daemon.stop());
}
