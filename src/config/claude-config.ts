import * as fs from 'fs';
import { expandPath } from '../shared/utils';

export interface ClaudeConfig {
  api_key?: string;
  base_url?: string;
}

export function loadClaudeConfig(): ClaudeConfig {
  const configPath = expandPath('~/.claude/settings.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const data = JSON.parse(content);
    return {
      api_key: data.api_key,
      base_url: data.base_url,
    };
  } catch {
    return {};
  }
}
