import { Command } from 'commander';
import * as pc from 'picocolors';
import { daemonCall } from './ipc-client';

export function analyzeCommands(program: Command): void {
  const analyze = program.command('analyze').description('Run strategy-based analysis');

  analyze
    .command('run')
    .description('Run a strategy against a task')
    .requiredOption('--task-id <id>', 'Task ID')
    .requiredOption('--strategy <id>', 'Strategy ID')
    .action(async (opts: { taskId: string; strategy: string }) => {
      const result = await daemonCall('analyze.run', { task_id: opts.taskId, strategy: opts.strategy }) as { enqueued: number };
      console.log(pc.green(`Enqueued ${result.enqueued} jobs for analysis`));
    });
}
