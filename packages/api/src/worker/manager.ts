import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { getLogger } from '@analyze-cli/core';

let workerProcess: ChildProcess | null = null;
const logger = getLogger();

export function startWorkers(): void {
  if (workerProcess) return;

  logger.info('Starting worker process...');
  workerProcess = spawn('node', [path.join(__dirname, 'consumer.js')], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: false,
  });

  workerProcess.on('exit', (code) => {
    logger.warn(`Worker exited with code ${code}`);
    workerProcess = null;
  });
}

export function stopWorkers(): void {
  if (workerProcess) {
    workerProcess.kill('SIGTERM');
    workerProcess = null;
  }
}
