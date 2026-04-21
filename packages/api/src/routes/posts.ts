import { FastifyInstance } from 'fastify';
import { listPosts, searchPosts, listCommentsByPost, listMediaFilesByPost, getPostAnalysisResults } from '@analyze-cli/core';

export default async function postsRoutes(app: FastifyInstance) {
  app.get('/posts', async (request) => {
    const { platform, limit = '50', offset = '0', query: searchQuery } = request.query as Record<string, string>;
    if (searchQuery) {
      return searchPosts(platform || '', searchQuery, parseInt(limit, 10));
    }
    return listPosts(platform || undefined, parseInt(limit, 10), parseInt(offset, 10));
  });

  app.get('/posts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const posts = await listPosts(undefined, 1, 0);
    const post = posts.find(p => p.id === id);
    if (!post) {
      reply.code(404);
      throw new Error(`Post not found: ${id}`);
    }
    return post;
  });

  app.get('/posts/:id/comments', async (request) => {
    const { id } = request.params as { id: string };
    return listCommentsByPost(id);
  });

  app.get('/posts/:id/media', async (request) => {
    const { id } = request.params as { id: string };
    return listMediaFilesByPost(id);
  });

  app.get('/posts/:id/analysis', async (request) => {
    const { id } = request.params as { id: string };
    return getPostAnalysisResults(id);
  });
}
