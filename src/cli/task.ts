import { Command } from 'commander';
import * as pc from 'picocolors';
import { getTemplateByName } from '../db/templates';
import { generateId } from '../shared/utils';
import { daemonCall } from './ipc-client';

export function taskCommands(program: Command): void {
  const task = program.command('task').description('Task management');

  task
    .command('create')
    .description('Create a new analysis task')
    .requiredOption('--name <name>', 'Task name')
    .option('--description <desc>', 'Task description')
    .option('--template <name>', 'Prompt template name')
    .option('--cli-templates <json>', 'JSON string of opencli command templates')
    .action(async (opts: { name: string; description?: string; template?: string; cliTemplates?: string }) => {
      let templateId: string | null = null;
      if (opts.template) {
        const tpl = await getTemplateByName(opts.template);
        if (!tpl) {
          console.log(pc.red(`Template not found: ${opts.template}`));
          process.exit(1);
        }
        templateId = tpl.id;
      }

      const id = generateId();
      await daemonCall('task.create', {
        id,
        name: opts.name,
        description: opts.description ?? null,
        template_id: templateId,
        cli_templates: opts.cliTemplates ?? null,
      });
      console.log(pc.green(`Task created: ${id}`));
      console.log(`  Name: ${opts.name}`);
      if (opts.description) console.log(`  Description: ${opts.description}`);
      if (opts.cliTemplates) console.log(`  CLI Templates: ${opts.cliTemplates}`);
      console.log();
    });

  task
    .command('add-posts')
    .description('Add posts to a task')
    .requiredOption('--task-id <id>', 'Task ID')
    .option('--post-ids <ids>', 'Comma-separated post IDs')
    .action(async (opts: { taskId: string; postIds?: string }) => {
      if (!opts.postIds) {
        console.log(pc.red('Error: --post-ids is required'));
        process.exit(1);
      }
      const postIds = opts.postIds.split(',').map(id => id.trim());
      await daemonCall('task.addTargets', { task_id: opts.taskId, target_type: 'post', target_ids: postIds });
      console.log(pc.green(`Added ${postIds.length} posts to task ${opts.taskId}`));
    });

  task
    .command('add-comments')
    .description('Add comments to a task')
    .requiredOption('--task-id <id>', 'Task ID')
    .option('--comment-ids <ids>', 'Comma-separated comment IDs')
    .action(async (opts: { taskId: string; commentIds?: string }) => {
      if (!opts.commentIds) {
        console.log(pc.red('Error: --comment-ids is required'));
        process.exit(1);
      }
      const commentIds = opts.commentIds.split(',').map(id => id.trim());
      await daemonCall('task.addTargets', { task_id: opts.taskId, target_type: 'comment', target_ids: commentIds });
      console.log(pc.green(`Added ${commentIds.length} comments to task ${opts.taskId}`));
    });

  task
    .command('start')
    .description('Start a task (enqueue jobs for analysis)')
    .requiredOption('--task-id <id>', 'Task ID')
    .action(async (opts: { taskId: string }) => {
      const full = await daemonCall('task.status', { task_id: opts.taskId }) as Record<string, any>;
      if (!full.id) {
        console.log(pc.red(`Task not found: ${opts.taskId}`));
        process.exit(1);
      }
      const pending = full.pending as { target_type: string; target_id: string }[] | undefined;
      if (!pending || pending.length === 0) {
        console.log(pc.yellow('No pending targets to process'));
        return;
      }

      const result = await daemonCall('task.start', { task_id: opts.taskId }) as {
        enqueued: number; skipped: number; mediaJobs: number;
      };

      if (result.skipped > 0) {
        console.log(pc.dim(`  Skipped ${result.skipped} already-analyzed targets`));
      }
      if (result.mediaJobs > 0) {
        console.log(pc.dim(`  Enqueued ${result.mediaJobs} media analysis jobs`));
      }
      console.log(pc.green(`Task started. Enqueued ${result.enqueued} jobs for analysis.`));
    });

  task
    .command('pause')
    .description('Pause a running task')
    .requiredOption('--task-id <id>', 'Task ID')
    .action(async (opts: { taskId: string }) => {
      await daemonCall('task.pause', { task_id: opts.taskId });
      console.log(pc.green(`Task ${opts.taskId} paused`));
    });

  task
    .command('resume')
    .description('Resume a paused task')
    .requiredOption('--task-id <id>', 'Task ID')
    .action(async (opts: { taskId: string }) => {
      await daemonCall('task.resume', { task_id: opts.taskId });
      console.log(pc.green(`Task ${opts.taskId} resumed`));
    });

  task
    .command('cancel')
    .description('Cancel a task')
    .requiredOption('--task-id <id>', 'Task ID')
    .action(async (opts: { taskId: string }) => {
      await daemonCall('task.cancel', { task_id: opts.taskId });
      console.log(pc.yellow(`Task ${opts.taskId} cancelled`));
    });

  task
    .command('list')
    .alias('ls')
    .description('List tasks')
    .option('--status <status>', 'Filter by status')
    .action(async (opts: { status?: string }) => {
      const tasks = await daemonCall('task.list', { status: opts.status }) as any[];
      if (tasks.length === 0) {
        console.log(pc.yellow('No tasks found'));
        return;
      }
      console.log(pc.bold('\nTasks:'));
      console.log(pc.dim('─'.repeat(80)));
      for (const t of tasks) {
        const statusColor = (s: string) => {
          switch (s) {
            case 'completed': return pc.green(s);
            case 'running': return pc.cyan(s);
            case 'failed': return pc.red(s);
            case 'paused': return pc.yellow(s);
            default: return pc.gray(s);
          }
        };
        console.log(`  ${pc.green(t.id.slice(0, 8))} ${pc.bold(t.name)} [${statusColor(t.status)}]`);
        if (t.stats) {
          const stats = typeof t.stats === 'string' ? JSON.parse(t.stats) : t.stats;
          console.log(`    Progress: ${stats.done}/${stats.total} done, ${stats.failed} failed`);
        }
      }
      console.log(pc.dim('─'.repeat(80)));
      console.log(`Total: ${tasks.length}\n`);
    });

  task
    .command('status')
    .description('Show task status and progress')
    .requiredOption('--task-id <id>', 'Task ID')
    .action(async (opts: { taskId: string }) => {
      const full = await daemonCall('task.status', { task_id: opts.taskId }) as Record<string, any>;
      if (!full.id) {
        console.log(pc.red(`Task not found: ${opts.taskId}`));
        process.exit(1);
      }
      console.log(pc.bold(`\nTask: ${full.name}`));
      console.log(`  ID:          ${full.id}`);
      console.log(`  Status:      ${full.status}`);
      console.log(`  Created:     ${full.created_at}`);
      if (full.completed_at) console.log(`  Completed:   ${full.completed_at}`);
      console.log(`\n  Progress:`);
      console.log(`    Total:     ${full.total ?? 0}`);
      console.log(`    Done:      ${full.done ?? 0}`);
      console.log(`    Failed:    ${full.failed ?? 0}`);
      console.log(`    Pending:   ${(full.pending as any[])?.length ?? 0}`);
      console.log();
    });
}
