import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FetchResult {
  success: boolean;
  data?: unknown[];
  error?: string;
}

/**
 * Execute an opencli command with template variable substitution.
 *
 * @param template - CLI command template with {variable} placeholders
 * @param vars - Variable values to substitute into the template
 * @param timeoutMs - Command timeout in milliseconds (default: 120000)
 */
export async function fetchViaOpencli(
  template: string,
  vars: Record<string, string>,
  timeoutMs: number = 120000,
): Promise<FetchResult> {
  const missingVars = extractPlaceholders(template).filter(v => !(v in vars));
  if (missingVars.length > 0) {
    return {
      success: false,
      error: `Missing template variables: ${missingVars.join(', ')}`,
    };
  }

  const command = substitutePlaceholders(template, vars);

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (stderr && !stdout) {
      return { success: false, error: stderr.trim() };
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }

    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return { success: true, data: [trimmed] };
    }

    if (Array.isArray(data)) {
      return { success: true, data };
    }
    if (typeof data === 'object' && data !== null) {
      const arr = (data as Record<string, unknown>).data ?? (data as Record<string, unknown>).items ?? [data];
      return { success: true, data: Array.isArray(arr) ? arr : [arr] };
    }

    return { success: true, data: [data] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('timeout')) {
      return { success: false, error: `Command timed out after ${timeoutMs}ms: ${command}` };
    }
    return { success: false, error: message };
  }
}

/** Extract {variable} placeholders from a template string. */
function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g) ?? [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

/** Substitute {variable} placeholders in a template string. */
function substitutePlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
