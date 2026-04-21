import { FastifyInstance } from 'fastify';
import {
  createTask, getTaskById, listTasks, updateTaskStatus, updateTaskStats,
  listTaskSteps, listJobsByTask, listStrategyResultsByTask, getStrategyResultStats,
  getTargetStats,
  generateId, now,
} from '@analyze-cli/core';

export default async function tasksRoutes(app: FastifyInstance) {
  app.get('/tasks', async (request) => {
    const { status, query: searchQuery } = request.query as Record<string, string>;
    return listTasks(status, searchQuery);
  });

  app.get('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = await getTaskById(id);
    if (!task) {
      reply.code(404);
      throw new Error(`Task not found: ${id}`);
    }

    const stats = await getTargetStats(id);
    const steps = await listTaskSteps(id);
    const jobs = await listJobsByTask(id);

    return {
      ...task,
      stats,
      steps: steps.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        strategy_id: s.strategy_id,
        step_order: s.step_order,
        stats: s.stats,
      })),
      jobs: jobs.map((j) => ({
        id: j.id,
        target_type: j.target_type,
        target_id: j.target_id,
        status: j.status,
        attempts: j.attempts,
        error: j.error,
      })),
    };
  });

  app.get('/tasks/:id/results', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { strategy_id } = request.query as Record<string, string>;

    if (!strategy_id) {
      reply.code(400);
      throw new Error('strategy_id is required');
    }

    const results = await listStrategyResultsByTask(strategy_id, id, 100);
    const stats = await getStrategyResultStats(strategy_id, id);

    return { results, stats };
  });

  app.post('/tasks', async (request) => {
    const data = request.body as Record<string, unknown>;
    const id = (data.id as string) ?? generateId();
    await createTask({
      id,
      name: data.name as string,
      description: (data.description ?? null) as string | null,
      template_id: (data.template_id ?? null) as string | null,
      cli_templates: (data.cli_templates ?? null) as string | null,
      status: 'pending',
      stats: { total: 0, done: 0, failed: 0 },
      created_at: now(),
      updated_at: now(),
      completed_at: null,
    });
    return { id };
  });

  app.post('/tasks/:id/start', async (request) => {
    const { id } = request.params as { id: string };
    await updateTaskStatus(id, 'running');
    return { status: 'running' };
  });

  app.post('/tasks/:id/pause', async (request) => {
    const { id } = request.params as { id: string };
    await updateTaskStatus(id, 'paused');
    return { status: 'paused' };
  });

  app.post('/tasks/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    await updateTaskStatus(id, 'failed');
    return { status: 'cancelled' };
  });
}
