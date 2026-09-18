import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../utils/logger';

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

/** Resend returned an explicit rejection, so the request is known not accepted. */
export class EmailProviderRejectedError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'EmailProviderRejectedError';
  }
}

/** The provider may have accepted the message; callers must not auto-retry. */
export class EmailProviderUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailProviderUnknownError';
  }
}

const KNOWN_REJECTED_RESEND_ERRORS = new Set([
  'validation_error',
  'missing_required_field',
  'invalid_parameter',
  'invalid_region',
  'invalid_idempotency_key',
  'invalid_from_address',
  'missing_api_key',
  'invalid_api_key',
  'restricted_api_key',
  'not_found',
  'method_not_allowed',
  'rate_limit_exceeded',
]);

export function classifyResendErrorName(name: string): 'retryable_rejected' | 'rejected' | 'unknown' {
  if (name === 'rate_limit_exceeded') return 'retryable_rejected';
  if (KNOWN_REJECTED_RESEND_ERRORS.has(name)) return 'rejected';
  return 'unknown';
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<string | null> {
  if (!resend) {
    logger.warn('mailer: RESEND_API_KEY not set — email skipped');
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: `The Jiggling Pig <${config.resend.from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: opts.headers,
  }, opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined);

  if (error) {
    logger.error('mailer: Resend send failed', { error });
    const providerName = 'name' in error ? String(error.name) : '';
    const classification = classifyResendErrorName(providerName);
    if (classification !== 'unknown') {
      throw new EmailProviderRejectedError(
        error.message,
        classification === 'retryable_rejected',
      );
    }
    throw new EmailProviderUnknownError(error.message);
  }

  if (!data?.id) {
    throw new EmailProviderUnknownError('Resend returned no message identifier');
  }
  logger.info('mailer: email sent', { id: data?.id, to: opts.to, subject: opts.subject });
  return data.id;
}

