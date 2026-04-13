import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function now(): Date {
  return new Date();
}

export function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    const home = process.env.HOME ?? '';
    return path.replace(/^~/, home);
  }
  return path;
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number,
): Promise<T> {
  return fn().catch(async (err) => {
    if (maxRetries <= 0) throw err;
    await sleep(baseDelayMs);
    return retryWithBackoff(fn, maxRetries - 1, baseDelayMs * 2);
  });
}
