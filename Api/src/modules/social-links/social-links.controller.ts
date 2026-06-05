import { Request, Response } from 'express';
import * as service from './social-links.service';

export async function getPublicLinks(_req: Request, res: Response) {
  const links = await service.listActive();
  res.json({ success: true, data: links });
}

export async function getAllLinks(_req: Request, res: Response) {
  const links = await service.listAll();
  res.json({ success: true, data: links });
}

export async function createLink(req: Request, res: Response) {
  const link = await service.createLink(req.body);
  res.status(201).json({ success: true, data: link });
}

export async function updateLink(req: Request, res: Response) {
  const link = await service.updateLink(req.params.id, req.body);
  if (!link) {
    return res.status(404).json({ success: false, message: 'Social link not found' });
  }
  res.json({ success: true, data: link });
}

export async function deleteLink(req: Request, res: Response) {
  const removed = await service.deleteLink(req.params.id);
  if (!removed) {
    return res.status(404).json({ success: false, message: 'Social link not found' });
  }
  res.json({ success: true, data: removed });
}

export async function reorderLinks(req: Request, res: Response) {
  const links = await service.reorder(req.body.ids);
  res.json({ success: true, data: links });
}
