import { Command } from 'commander';
import * as pc from 'picocolors';
import { daemonCall } from './ipc-client';

export function taskPrepareCommands(program: Command): void {
  const task = program.commands.find(c => c.name() === 'task') ?? program.command('task');

  task
    .command('prepare-data')
    .description('Download comments and media for task posts via opencli (resumable)')
    .requiredOption('--task-id <id>', 'Task ID')
    .action(async (opts: { taskId: string }) => {
      const task = await daemonCall('task.status', { task_id: opts.taskId }) as Record<string, any>;
      if (!task.id) {
        console.log(pc.red(`Task not found: ${opts.taskId}`));
        process.exit(1);
      }

      if (!task.cli_templates) {
        console.log(pc.red('Task has no CLI templates. Create the task with --cli-templates.'));
        process.exit(1);
      }

      const result = await daemonCall('task.prepareData', { task_id: opts.taskId }) as {
        success: number;
        failed: number;
        skipped: number;
      };

      console.log(pc.dim('\n' + '─'.repeat(40)));
      console.log(pc.green('\nData preparation complete:'));
      console.log(`  Success: ${result.success}`);
      console.log(`  Skipped (already done): ${result.skipped}`);
      console.log(`  Failed: ${result.failed}`);
      console.log();
    });
}
