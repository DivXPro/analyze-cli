import { listTaskSteps, updateTaskStepStatus } from '../db/task-steps';
import { getStrategyById } from '../db/strategies';
import { listTaskTargets } from '../db/task-targets';
import { query } from '../db/client';
import { enqueueJobs, getExistingJobTargets } from '../db/queue-jobs';
import { generateId } from '../shared/utils';

export interface EnqueueResult {
  enqueued: number;
  skipped: number;
}

export async function onPostReady(
  taskId: string,
  postId: string,
): Promise<EnqueueResult> {
  const steps = await listTaskSteps(taskId);
  const pendingSteps = steps.filter(s => s.status === 'pending' || s.status === 'running');

  let totalEnqueued = 0;
  let totalSkipped = 0;

  for (const step of pendingSteps) {
    if (!step.strategy_id) continue;

    const strategy = await getStrategyById(step.strategy_id);
    if (!strategy) continue;

    // Check media dependency
    if (strategy.needs_media && strategy.needs_media.enabled) {
      const mediaReady = await isPostMediaReady(taskId, postId);
      if (!mediaReady) {
        totalSkipped++;
        continue;
      }
    }

    // Resolve targets for this step on this post
    const targets = await resolveTargetsForPost(taskId, postId, strategy.target);
    if (targets.length === 0) continue;

    // Skip targets already enqueued for this step
    const existing = await getExistingJobTargets(taskId, step.strategy_id);
    const newTargets = targets.filter(t => !existing.has(t.target_id));

    if (newTargets.length === 0) continue;

    // Build jobs
    const jobs = newTargets.map(t => ({
      id: generateId(),
      task_id: taskId,
      strategy_id: step.strategy_id,
      target_type: strategy.target as 'post' | 'comment',
      target_id: t.target_id,
      status: 'pending' as const,
      priority: 0,
      attempts: 0,
      max_attempts: 3,
      error: null,
      created_at: new Date(),
      processed_at: null,
    }));

    await enqueueJobs(jobs);
    totalEnqueued += jobs.length;

    // Update step stats
    const currentTotal = (step.stats?.total ?? 0) + jobs.length;
    await updateTaskStepStatus(step.id, step.status === 'pending' ? 'running' : step.status, {
      total: currentTotal,
      done: step.stats?.done ?? 0,
      failed: step.stats?.failed ?? 0,
    });
  }

  return { enqueued: totalEnqueued, skipped: totalSkipped };
}

async function isPostMediaReady(taskId: string, postId: string): Promise<boolean> {
  const rows = await query<{ media_fetched: boolean }>(
    `SELECT media_fetched FROM task_post_status WHERE task_id = ? AND post_id = ?`,
    [taskId, postId]
  );
  return rows[0]?.media_fetched === true;
}

async function resolveTargetsForPost(
  taskId: string,
  postId: string,
  targetType: string,
): Promise<Array<{ target_id: string; target_type: string }>> {
  if (targetType === 'post') {
    const targets = await listTaskTargets(taskId);
    const isMember = targets.some(t => t.target_type === 'post' && t.target_id === postId);
    if (!isMember) return [];
    return [{ target_id: postId, target_type: 'post' }];
  }

  if (targetType === 'comment') {
    const rows = await query<{ id: string }>(
      `SELECT id FROM comments WHERE post_id = ?`,
      [postId]
    );
    return rows.map(r => ({ target_id: r.id, target_type: 'comment' }));
  }

  return [];
}
