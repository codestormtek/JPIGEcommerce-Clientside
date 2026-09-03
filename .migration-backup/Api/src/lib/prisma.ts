import { PrismaClient } from '@prisma/client';
import { config } from '../config';

declare global {
  // Allow a global var in development to prevent multiple instances during hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: config.env === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (config.env !== 'production') {
  global.__prisma = prisma;
}

export default prisma;

