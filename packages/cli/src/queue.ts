import { Command } from 'commander';
import * as pc from 'picocolors';
import { daemonCall } from './ipc-client';

export function queueCommands(program: Command): void {
  const queue = program.command('queue').description('Queue management');

  queue
    .command('list')
    .alias('ls')
    .description('List queue jobs')
    .requiredOption('--task-id <id>', 'Task ID')
    .option('--failed-only', 'Show only failed jobs')
    .option('--limit <n>', 'Max jobs to show', '20')
    .action(async (opts: { taskId: string; failedOnly?: boolean; limit: string }) => {
      try {
        const jobs = await daemonCall('queue.list', {
          task_id: opts.taskId,
          failed_only: opts.failedOnly ?? false,
          limit: parseInt(opts.limit, 10),
        }) as { id: string; target_id: string; status: string; attempts: number; error: string | null }[];

        if (jobs.length === 0) {
          console.log(pc.yellow('No jobs found'));
          return;
        }

        console.log(pc.bold(`\nQueue jobs for task ${opts.taskId.slice(0, 8)}:`));
        console.log(pc.dim('─'.repeat(90)));
        for (const j of jobs) {
          const statusColor = j.status === 'completed' ? pc.green : j.status === 'failed' ? pc.red : j.status === 'processing' ? pc.cyan : pc.gray;
          console.log(`  ${j.id.slice(0, 8)}  ${statusColor(j.status.padEnd(12))}  attempts=${j.attempts}  ${pc.cyan(j.target_id?.slice(0, 16) ?? '-')}`);
          if (j.error) {
            console.log(`    ${pc.red(j.error.slice(0, 120))}`);
          }
        }
        console.log(pc.dim('─'.repeat(90)));
        console.log(`Total: ${jobs.length}\n`);
      } catch (err: unknown) {
        console.log(pc.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

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
