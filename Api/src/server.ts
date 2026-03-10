import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import prisma from './lib/prisma';
import { startScheduler } from './jobs/scheduler';
import { seedDefaultSettings } from './modules/site-settings/site-settings.service';

async function main(): Promise<void> {
  // Verify DB connection before accepting traffic
  await prisma.$connect();
  logger.info('Database connected');
  startScheduler();
  await seedDefaultSettings().catch((err) => logger.warn('Site settings seed skipped', { err }));

  const server = app.listen(config.port, () => {
    logger.info(`🚀 API running on http://localhost:${config.port} [${config.env}]`);
  });

  // ─── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down gracefully…`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Database disconnected. Bye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});

