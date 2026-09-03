import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { ListPagesInput, CreatePageInput, UpdatePageInput } from './pages.schema';
import * as service from './pages.service';

export async function listPages(req: Request, res: Response): Promise<void> {
  const result = await service.listPages(req.query as unknown as ListPagesInput);
  sendPaginated(res, result);
}

export async function getPage(req: Request, res: Response): Promise<void> {
  const page = await service.getPageById(req.params['id'] as string);
  sendSuccess(res, page);
}

export async function createPage(req: Request, res: Response): Promise<void> {
  const page = await service.createPage(req.body as CreatePageInput);
  sendCreated(res, page, 'Page created');
}

export async function updatePage(req: Request, res: Response): Promise<void> {
  const page = await service.updatePage(req.params['id'] as string, req.body as UpdatePageInput);
  sendSuccess(res, page, 'Page updated');
}

export async function deletePage(req: Request, res: Response): Promise<void> {
  await service.deletePage(req.params['id'] as string);
  sendNoContent(res);
}
