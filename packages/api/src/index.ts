import fastify from 'fastify';
import staticPlugin from '@fastify/static';
import * as path from 'path';
import { config, migrate, seedPlatforms } from '@analyze-cli/core';
import { setupAuth } from './auth';
import { registerRoutes } from './routes';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

async function main() {
  await migrate();
  await seedPlatforms();

  const app = fastify({
    logger: { level: config.logging.level },
  });

  // Register static file serving for UI
  await app.register(staticPlugin, {
    root: path.resolve(__dirname, '../../ui/dist'),
    prefix: '/',
  });

  // SPA fallback: serve index.html for non-API, non-static routes
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/') || request.url === '/health') {
      reply.code(404).send({ error: 'Not Found' });
      return;
    }
    return reply.sendFile('index.html');
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await setupAuth(app);
  await registerRoutes(app);

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API server + UI on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
