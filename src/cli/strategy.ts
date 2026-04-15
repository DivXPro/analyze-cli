import { Command } from 'commander';
import * as pc from 'picocolors';
import { daemonCall } from './ipc-client';

export function strategyCommands(program: Command): void {
  const strategy = program.command('strategy').description('Strategy management');

  strategy
    .command('list')
    .alias('ls')
    .description('List all imported strategies')
    .action(async () => {
      const strategies = await daemonCall('strategy.list', {}) as any[];
      if (strategies.length === 0) {
        console.log(pc.yellow('No strategies found'));
        return;
      }
      console.log(pc.bold('\nStrategies:'));
      console.log(pc.dim('─'.repeat(80)));
      for (const s of strategies) {
        console.log(`  ${pc.green(s.id)} ${pc.bold(s.name)} [${s.target}] v${s.version}`);
      }
      console.log(pc.dim('─'.repeat(80)));
    });

  strategy
    .command('import')
    .description('Import a strategy from a JSON file')
    .requiredOption('--file <file>', 'Path to strategy JSON file')
    .action(async (opts: { file: string }) => {
      const result = await daemonCall('strategy.import', { file: opts.file }) as { imported: boolean; id?: string; reason?: string };
      if (result.imported) {
        console.log(pc.green(`Strategy imported: ${result.id}`));
      } else {
        console.log(pc.yellow(`Skipped: ${result.reason}`));
      }
    });

  strategy
    .command('show')
    .description('Show strategy details')
    .requiredOption('--id <id>', 'Strategy ID')
    .action(async (opts: { id: string }) => {
      const s = await daemonCall('strategy.show', { id: opts.id }) as any;
      console.log(pc.bold(`\nStrategy: ${s.name}`));
      console.log(`  ID:       ${s.id}`);
      console.log(`  Target:   ${s.target}`);
      console.log(`  Version:  ${s.version}`);
      if (s.description) console.log(`  Desc:     ${s.description}`);
    });
}
