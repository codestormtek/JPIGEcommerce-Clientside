import { ApiError } from '../../utils/apiError';
import { sendEmail } from '../../lib/mailer';
import {
  ListMessageTemplatesInput,
  CreateMessageTemplateInput,
  UpdateMessageTemplateInput,
  TestMessageTemplateInput,
} from './message-templates.schema';
import * as repo from './message-templates.repository';

// ─── Sample values for test sends ────────────────────────────────────────────

const SAMPLE_VARS: Record<string, string> = {
  '{{store.name}}':            'The Jiggling Pig, LLC',
  '{{store.url}}':             'https://thejugglingpig.com',
  '{{store.email}}':           'hello@thejugglingpig.com',
  '{{customer.email}}':        'test@example.com',
  '{{customer.firstName}}':    'Jane',
  '{{customer.lastName}}':     'Smith',
  '{{customer.fullName}}':     'Jane Smith',
  '{{order.id}}':              'ORD-TEST-001',
  '{{order.shortId}}':         'TEST-001',
  '{{order.total}}':           '$42.50',
  '{{order.status}}':          'confirmed',
  '{{order.placedAt}}':        new Date().toLocaleString(),
  '{{product.name}}':          'Pulled Pork Sandwich',
  '{{product.price}}':         '$12.00',
};

function renderTemplate(text: string): string {
  return Object.entries(SAMPLE_VARS).reduce(
    (acc, [token, value]) => acc.replaceAll(token, value),
    text,
  );
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function listMessageTemplates(input: ListMessageTemplatesInput) {
  return repo.findMessageTemplates(input);
}

export async function getMessageTemplateById(id: string) {
  const tpl = await repo.findMessageTemplateById(id);
  if (!tpl) throw ApiError.notFound('Message template');
  return tpl;
}

export async function createMessageTemplate(input: CreateMessageTemplateInput) {
  return repo.createMessageTemplate(input);
}

export async function updateMessageTemplate(id: string, input: UpdateMessageTemplateInput) {
  await getMessageTemplateById(id);
  return repo.updateMessageTemplate(id, input);
}

export async function deleteMessageTemplate(id: string) {
  await getMessageTemplateById(id);
  return repo.deleteMessageTemplate(id);
}

export async function testMessageTemplate(id: string, input: TestMessageTemplateInput) {
  const tpl = await getMessageTemplateById(id);

  const subject = tpl.subject ? renderTemplate(tpl.subject) : `[Test] ${tpl.name}`;
  const html    = tpl.bodyHtml ? renderTemplate(tpl.bodyHtml) : undefined;
  const text    = renderTemplate(tpl.bodyText);

  await sendEmail({
    to:      input.testEmail,
    subject: `[TEST] ${subject}`,
    html:    html ?? `<pre>${text}</pre>`,
    text,
  });

  return { sent: true, to: input.testEmail };
}

