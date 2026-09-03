import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import {
  ListMessageTemplatesInput,
  CreateMessageTemplateInput,
  UpdateMessageTemplateInput,
  TestMessageTemplateInput,
} from './message-templates.schema';
import * as service from './message-templates.service';

// GET /api/v1/message-templates
export async function listMessageTemplates(req: Request, res: Response): Promise<void> {
  const result = await service.listMessageTemplates(req.query as unknown as ListMessageTemplatesInput);
  sendPaginated(res, result);
}

// GET /api/v1/message-templates/:id
export async function getMessageTemplateById(req: Request, res: Response): Promise<void> {
  const tpl = await service.getMessageTemplateById(req.params['id'] as string);
  sendSuccess(res, tpl);
}

// POST /api/v1/message-templates
export async function createMessageTemplate(req: Request, res: Response): Promise<void> {
  const tpl = await service.createMessageTemplate(req.body as CreateMessageTemplateInput);
  sendCreated(res, tpl, 'Message template created');
}

// PATCH /api/v1/message-templates/:id
export async function updateMessageTemplate(req: Request, res: Response): Promise<void> {
  const tpl = await service.updateMessageTemplate(
    req.params['id'] as string,
    req.body as UpdateMessageTemplateInput,
  );
  sendSuccess(res, tpl, 'Message template updated');
}

// DELETE /api/v1/message-templates/:id
export async function deleteMessageTemplate(req: Request, res: Response): Promise<void> {
  await service.deleteMessageTemplate(req.params['id'] as string);
  sendNoContent(res);
}

// POST /api/v1/message-templates/:id/test
export async function testMessageTemplate(req: Request, res: Response): Promise<void> {
  const result = await service.testMessageTemplate(
    req.params['id'] as string,
    req.body as TestMessageTemplateInput,
  );
  sendSuccess(res, result, 'Test email sent');
}

