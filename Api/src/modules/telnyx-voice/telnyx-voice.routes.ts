import { Router, Request, Response } from 'express';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export const telnyxVoiceRouter = Router();

function toE164(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (input && input.startsWith('+')) return input;
  return digits ? `+${digits}` : '';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTeXML(): string {
  const forwardTo = toE164(config.telnyx.voiceForwardTo);
  const callerId = toE164(config.telnyx.fromNumber);

  if (!forwardTo) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling The Jiggling Pig. We are unable to take your call right now. Please try again later, or visit us online at the jiggling pig dot com.</Say>
  <Hangup/>
</Response>`;
  }

  const callerIdAttr = callerId ? ` callerId="${escapeXml(callerId)}"` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial${callerIdAttr} timeout="25" answerOnBridge="true">${escapeXml(forwardTo)}</Dial>
</Response>`;
}

function handleVoice(_req: Request, res: Response): void {
  const xml = buildTeXML();
  logger.info('telnyx-voice: returning call-forward TeXML', {
    forwardConfigured: Boolean(config.telnyx.voiceForwardTo),
  });
  res.set('Content-Type', 'text/xml');
  res.send(xml);
}

// Telnyx TeXML application points its Voice webhook here.
// Accepts both GET and POST since the webhook method is configurable in Telnyx.
telnyxVoiceRouter.get('/voice', handleVoice);
telnyxVoiceRouter.post('/voice', handleVoice);
