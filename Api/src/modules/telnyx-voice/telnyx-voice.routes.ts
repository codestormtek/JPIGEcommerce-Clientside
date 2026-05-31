import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { sendEmail } from '../../lib/mailer';

export const telnyxVoiceRouter = Router();

// Secret token embedded in the TeXML action callback URLs we generate.
// Telnyx echoes the full URL (incl. ?k=) back to our callbacks, but an
// attacker cannot guess it — this prevents forged voicemail-email spam on
// the unauthenticated, rate-limit-exempt /voice/* callbacks.
function callbackToken(): string {
  const secret = config.telnyx.webhookToken || config.telnyx.apiKey || 'telnyx-voice-fallback';
  return crypto.createHash('sha256').update(`telnyx-voice:${secret}`).digest('hex').slice(0, 32);
}

function isValidToken(req: Request): boolean {
  const provided = String(req.query.k ?? '');
  const expected = callbackToken();
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

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

const GREETING =
  "You've reached The Jiggling Pig. Sorry we missed your call. " +
  'Please leave your name, number, and a short message after the tone, ' +
  "and we'll get back to you as soon as we can.";

function xmlResponse(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${inner}\n</Response>`;
}

// TeXML that records a voicemail, then emails it via the recording callback.
function buildVoicemailTeXML(): string {
  const recordingAction = `${config.telnyx.publicUrl}/voice/recording?k=${callbackToken()}`;
  return xmlResponse(
    `  <Say voice="alice">${escapeXml(GREETING)}</Say>\n` +
      `  <Record action="${escapeXml(recordingAction)}" method="POST" maxLength="180" playBeep="true" timeout="5" finishOnKey="#"/>\n` +
      `  <Say voice="alice">We did not receive a message. Goodbye.</Say>\n` +
      `  <Hangup/>`,
  );
}

// First leg: forward to the cell. If unanswered, the dial action callback
// routes the caller to voicemail. Ring timeout is kept below typical cell
// voicemail pickup (~25s) so OUR business voicemail catches it first.
function buildForwardTeXML(): string {
  const forwardTo = toE164(config.telnyx.voiceForwardTo);
  if (!forwardTo) {
    // No forward number configured — go straight to voicemail.
    return buildVoicemailTeXML();
  }
  const callerId = toE164(config.telnyx.fromNumber);
  const callerIdAttr = callerId ? ` callerId="${escapeXml(callerId)}"` : '';
  const dialAction = `${config.telnyx.publicUrl}/voice/dial-status?k=${callbackToken()}`;
  return xmlResponse(
    `  <Dial${callerIdAttr} action="${escapeXml(dialAction)}" method="POST" timeout="20" answerOnBridge="true">${escapeXml(
      forwardTo,
    )}</Dial>`,
  );
}

function handleVoice(_req: Request, res: Response): void {
  logger.info('telnyx-voice: incoming call', {
    forwardConfigured: Boolean(config.telnyx.voiceForwardTo),
  });
  res.set('Content-Type', 'text/xml');
  res.send(buildForwardTeXML());
}

// Called by Telnyx after the forward <Dial> completes. If the call was not
// answered, send the caller to voicemail; otherwise just hang up.
function handleDialStatus(req: Request, res: Response): void {
  if (!isValidToken(req)) {
    logger.warn('telnyx-voice: rejected dial-status with invalid token');
    res.status(403).send('Forbidden');
    return;
  }
  const dialStatus = String(req.body?.DialCallStatus ?? '').toLowerCase();
  logger.info('telnyx-voice: dial status', { dialStatus });
  res.set('Content-Type', 'text/xml');
  if (dialStatus === 'completed') {
    res.send(xmlResponse('  <Hangup/>'));
    return;
  }
  res.send(buildVoicemailTeXML());
}

// Called by Telnyx when a voicemail recording is ready. Emails the recording.
async function handleRecording(req: Request, res: Response): Promise<void> {
  if (!isValidToken(req)) {
    logger.warn('telnyx-voice: rejected recording with invalid token');
    res.status(403).send('Forbidden');
    return;
  }
  const recordingUrl = String(req.body?.RecordingUrl ?? '');
  const from = String(req.body?.From ?? 'Unknown');
  const to = String(req.body?.To ?? '');
  const durationRaw = String(req.body?.RecordingDuration ?? '');
  const duration = durationRaw ? `${durationRaw} sec` : 'unknown length';
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  logger.info('telnyx-voice: voicemail recording received', {
    from,
    to,
    duration: durationRaw,
    hasUrl: Boolean(recordingUrl),
  });

  if (recordingUrl) {
    try {
      const safeFrom = escapeXml(from);
      const safeUrl = escapeXml(recordingUrl);
      await sendEmail({
        to: config.telnyx.voicemailEmail,
        subject: `New voicemail from ${from}`,
        html:
          `<h2>New voicemail for The Jiggling Pig</h2>` +
          `<p><strong>From:</strong> ${safeFrom}<br/>` +
          `<strong>To:</strong> ${escapeXml(to)}<br/>` +
          `<strong>Received:</strong> ${escapeXml(when)} (ET)<br/>` +
          `<strong>Length:</strong> ${escapeXml(duration)}</p>` +
          `<p><a href="${safeUrl}">Click here to listen to the voicemail</a></p>` +
          `<p style="color:#888;font-size:12px">Recording link: ${safeUrl}</p>`,
        text:
          `New voicemail for The Jiggling Pig\n\n` +
          `From: ${from}\nTo: ${to}\nReceived: ${when} (ET)\nLength: ${duration}\n\n` +
          `Listen: ${recordingUrl}\n`,
      });
    } catch (err) {
      logger.error('telnyx-voice: failed to email voicemail', { err });
    }
  }

  res.set('Content-Type', 'text/xml');
  res.send(xmlResponse('  <Say voice="alice">Thank you. Goodbye.</Say>\n  <Hangup/>'));
}

// Telnyx TeXML application points its Voice webhook here.
// Accepts both GET and POST since the webhook method is configurable in Telnyx.
telnyxVoiceRouter.get('/voice', handleVoice);
telnyxVoiceRouter.post('/voice', handleVoice);

// TeXML action callbacks (always POST from Telnyx).
telnyxVoiceRouter.post('/voice/dial-status', handleDialStatus);
telnyxVoiceRouter.post('/voice/recording', handleRecording);
