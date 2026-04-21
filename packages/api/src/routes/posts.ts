import { FastifyInstance } from 'fastify';
import { listPosts, searchPosts, listCommentsByPost, listMediaFilesByPost } from '@analyze-cli/core';

export default async function postsRoutes(app: FastifyInstance) {
  app.get('/posts', async (request) => {
    const { platform, limit = '50', offset = '0', query: searchQuery } = request.query as Record<string, string>;
    if (searchQuery) {
      return searchPosts(platform ?? '', searchQuery, parseInt(limit, 10));
    }
    return listPosts(platform, parseInt(limit, 10), parseInt(offset, 10));
  });

  app.get('/posts/:id/comments', async (request) => {
    const { id } = request.params as { id: string };
    return listCommentsByPost(id);
  });

  app.get('/posts/:id/media', async (request) => {
    const { id } = request.params as { id: string };
    return listMediaFilesByPost(id);
  });
}
