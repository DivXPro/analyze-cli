import fastify from 'fastify';
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

  app.get('/health', async () => ({ status: 'ok' }));

  await setupAuth(app);
  await registerRoutes(app);

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
