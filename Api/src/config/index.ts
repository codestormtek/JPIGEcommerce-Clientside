import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),

  database: {
    url: requiredEnv('DATABASE_URL'),
  },

  jwt: {
    secret: requiredEnv('JWT_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? requiredEnv('JWT_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  cors: {
    allowedOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:5000').split(','),
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },

  stripe: {
    secretKey: requiredEnv('STRIPE_SECRET_KEY'),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    taxEnabled: process.env.STRIPE_TAX_ENABLED === 'true',
  },

  jobs: {
    lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD ?? '5', 10),
    autoDisableOutOfStock: process.env.AUTO_DISABLE_OUT_OF_STOCK === 'true',
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS ?? '90', 10),
  },

  uploads: {
    dir: process.env.UPLOADS_DIR ?? 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '25', 10),
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'r2', // 'local' | 'r2'
    r2: {
      endpoint: process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID ?? ''}.r2.cloudflarestorage.com`,
      accountId: process.env.R2_ACCOUNT_ID ?? '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.R2_BUCKET ?? '',
      publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, ''),
    },
  },

  exports: {
    maxRows: parseInt(process.env.EXPORT_MAX_ROWS ?? '50000', 10),
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.RESEND_FROM ?? 'invoices@thejugglingpig.com',
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? '',
  },


} as const;

