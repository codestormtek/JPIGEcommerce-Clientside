import { Resend } from 'resend';
import { config } from '../config';
import { logger } from '../utils/logger';

const resend = new Resend(config.resend.apiKey);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(opts: SendEmailOptions): Promise<string | null> {
  if (!config.resend.apiKey) {
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
  });

  if (error) {
    logger.error('mailer: Resend send failed', { error });
    throw new Error(error.message);
  }

  logger.info('mailer: email sent', { id: data?.id, to: opts.to, subject: opts.subject });
  return data?.id ?? null;
}

