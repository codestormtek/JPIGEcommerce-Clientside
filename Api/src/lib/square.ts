import { SquareClient, SquareEnvironment } from 'square';
import { logger } from '../utils/logger';

let _client: SquareClient | null = null;

export function getSquareClient(): SquareClient {
  if (_client) return _client;

  const token = process.env.SQUARE_ACCESS_TOKEN ?? '';
  const env   = process.env.SQUARE_ENVIRONMENT ?? 'sandbox';

  if (!token) {
    logger.warn('SQUARE_ACCESS_TOKEN is not set — Square payments will fail at runtime');
  }

  _client = new SquareClient({
    token,
    environment: env === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  return _client;
}

export function resetSquareClient(): void {
  _client = null;
}
