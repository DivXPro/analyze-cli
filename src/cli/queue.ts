import { Command } from 'commander';
import * as pc from 'picocolors';
import { daemonCall } from './ipc-client';

export function queueCommands(program: Command): void {
  const queue = program.command('queue').description('Queue management');

  queue
    .command('retry')
    .description('Retry failed queue jobs')
    .option('--task-id <id>', 'Limit retries to a specific task')
    .action(async (opts: { taskId?: string }) => {
      try {
        const result = await daemonCall('queue.retry', { task_id: opts.taskId ?? null }) as { retried: number };
        console.log(pc.green(`Retried ${result.retried} failed jobs`));
      } catch (err: unknown) {
        console.log(pc.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  queue
    .command('reset')
    .description('Reset all non-pending queue jobs to pending')
    .option('--task-id <id>', 'Limit reset to a specific task')
    .action(async (opts: { taskId?: string }) => {
      try {
        const result = await daemonCall('queue.reset', { task_id: opts.taskId ?? null }) as { reset: number };
        console.log(pc.green(`Reset ${result.reset} jobs`));
      } catch (err: unknown) {
        console.log(pc.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
