import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { ctxFromRequest } from '../../utils/auditLogger';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import * as service from './smart-links.service';
import { CreateSmartLinkInput, SmartLinkConfigInput, UpdateSmartLinkInput } from './smart-links.schema';

export async function list(_req: AuthRequest, res: Response) {
  sendSuccess(res, await service.listSmartLinks());
}

export async function create(req: AuthRequest, res: Response) {
  sendCreated(res, await service.createSmartLink(req.body as CreateSmartLinkInput, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function update(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.updateSmartLink(req.params.id, req.body as UpdateSmartLinkInput, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function deactivate(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.deactivateSmartLink(req.params.id, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function reactivate(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.reactivateSmartLink(req.params.id, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function getConfig(_req: AuthRequest, res: Response) {
  sendSuccess(res, await service.getSmartLinkConfig());
}

export async function updateConfig(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.updateSmartLinkConfig(req.body as SmartLinkConfigInput));
}

export async function duplicate(req: AuthRequest, res: Response) {
  sendCreated(res, await service.duplicateSmartLink(req.params.id, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function metrics(req: AuthRequest, res: Response) {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  sendSuccess(res, await service.smartLinkMetrics(req.params.id, days));
}

export async function auditHistory(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.smartLinkAuditHistory(req.params.id));
}

export async function qrSvg(req: AuthRequest, res: Response) {
  const svg = await service.smartLinkQrSvg(req.params.id);
  res.set({ 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'private, max-age=300' }).send(svg);
}

export async function qrPng(req: AuthRequest, res: Response) {
  const png = await service.smartLinkQrPng(req.params.id);
  res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' }).send(png);
}

export async function signPdf(req: AuthRequest, res: Response) {
  const pdf = await service.smartLinkSignPdf(req.params.id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="smart-link-sign.pdf"',
    'Cache-Control': 'private, no-store',
  }).send(pdf);
}

export async function redirect(req: Request, res: Response) {
  const resolved = await service.resolveSmartLink(req.params.slug, req.header('referer'), req.query.test !== '1');
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.redirect(302, resolved.url);
}

export async function relayResolve(req: Request, res: Response) {
  const resolved = await service.resolveSmartLink(req.params.slug, req.header('referer'), req.query.test !== '1');
  sendSuccess(res, resolved);
}
