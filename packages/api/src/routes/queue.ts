import { FastifyInstance } from 'fastify';
import { retryFailedJobs, resetJobs, getQueueStats } from '@analyze-cli/core';

export default async function queueRoutes(app: FastifyInstance) {
  app.get('/queue', async (request) => {
    const { task_id } = request.query as Record<string, string>;
    return { task_id, stats: await getQueueStats() };
  });

  app.post('/queue/:id/retry', async (request) => {
    const { id } = request.params as { id: string };
    const retried = await retryFailedJobs(id);
    return { retried };
  });
}
