import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

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
  const limit = Number.isNaN(parseInt(limitRaw, 10)) ? 3 : parseInt(limitRaw, 10);

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

async function main() {
  const opts = parseArgs();
  await fs.promises.mkdir(opts.outputDir, { recursive: true });
  console.log(`[record] Output dir: ${opts.outputDir}`);
  console.log(`[record] Platform: ${opts.platform}, Query: "${opts.query}", Limit: ${opts.limit}`);
}

main().catch(err => {
  console.error('[record] Fatal error:', err);
  process.exit(1);
});
