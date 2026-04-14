import { query, run } from './client';
import { TaskPostStatus } from '../shared/types';
import { now } from '../shared/utils';

export async function upsertTaskPostStatus(
  taskId: string,
  postId: string,
  updates: Partial<TaskPostStatus>,
): Promise<void> {
  const ts = now();
  await run(
    `INSERT INTO task_post_status (task_id, post_id, comments_fetched, media_fetched, comments_count, media_count, status, error, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(task_id, post_id) DO UPDATE SET
       comments_fetched = COALESCE(excluded.comments_fetched, task_post_status.comments_fetched),
       media_fetched = COALESCE(excluded.media_fetched, task_post_status.media_fetched),
       comments_count = COALESCE(excluded.comments_count, task_post_status.comments_count),
       media_count = COALESCE(excluded.media_count, task_post_status.media_count),
       status = COALESCE(excluded.status, task_post_status.status),
       error = COALESCE(excluded.error, task_post_status.error),
       updated_at = ?`,
    [
      taskId,
      postId,
      updates.comments_fetched ?? false,
      updates.media_fetched ?? false,
      updates.comments_count ?? 0,
      updates.media_count ?? 0,
      updates.status ?? 'pending',
      updates.error ?? null,
      ts,
      ts,
    ],
  );
}

export async function getTaskPostStatuses(taskId: string): Promise<TaskPostStatus[]> {
  return query<TaskPostStatus>('SELECT * FROM task_post_status WHERE task_id = ? ORDER BY post_id', [taskId]);
}

export async function getTaskPostStatus(taskId: string, postId: string): Promise<TaskPostStatus | null> {
  const rows = await query<TaskPostStatus>('SELECT * FROM task_post_status WHERE task_id = ? AND post_id = ?', [taskId, postId]);
  return rows[0] ?? null;
}

export async function getPendingPostIds(taskId: string): Promise<{ post_id: string; comments_fetched: boolean; media_fetched: boolean }[]> {
  return query(
    `SELECT post_id, comments_fetched, media_fetched FROM task_post_status
     WHERE task_id = ? AND (comments_fetched = FALSE OR media_fetched = FALSE)
     ORDER BY post_id`,
    [taskId],
  );
}
