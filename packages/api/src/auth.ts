import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

const AUTH_TOKEN = process.env.API_TOKEN ?? crypto.randomBytes(32).toString('hex');

let printed = false;
export function getAuthToken(): string {
  if (!printed) {
    console.log('\nAPI Auth Token:', AUTH_TOKEN);
    console.log('   Store this in localStorage as "api_token" in the UI\n');
    printed = true;
  }
  return AUTH_TOKEN;
}

export async function setupAuth(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return;

    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      reply.code(401);
      throw new Error('Missing Authorization header');
    }

    const token = auth.slice(7);
    if (token !== AUTH_TOKEN) {
      reply.code(403);
      throw new Error('Invalid token');
    }
  });
}
