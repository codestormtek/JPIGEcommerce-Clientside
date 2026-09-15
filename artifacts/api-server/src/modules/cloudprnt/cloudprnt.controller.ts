import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { ctxFromRequest } from '../../utils/auditLogger';
import { sendCreated, sendSuccess } from '../../utils/apiResponse';
import * as service from './cloudprnt.service';
import { CreatePrinterInput, UpdatePrinterInput } from './cloudprnt.schema';

export async function getSettings(_req: AuthRequest, res: Response) {
  sendSuccess(res, await service.getCloudPrntSettings());
}

export async function saveSettings(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.saveCloudPrntSettings(req.body, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function list(_req: AuthRequest, res: Response) {
  sendSuccess(res, await service.listPrinters());
}

export async function create(req: AuthRequest, res: Response) {
  sendCreated(res, await service.createPrinter(req.body as CreatePrinterInput, req.user!.sub, ctxFromRequest(req, req.user!.sub)), 'Printer created — save its credential now; it is shown only once.');
}

export async function update(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.updatePrinter(req.params.printerId, req.body as UpdatePrinterInput, req.user!.sub, ctxFromRequest(req, req.user!.sub)));
}

export async function testTicket(req: AuthRequest, res: Response) {
  sendCreated(res, await service.createTestTicket(req.params.printerId, req.user!.sub, ctxFromRequest(req, req.user!.sub)), 'Test ticket queued');
}

export async function jobs(req: AuthRequest, res: Response) {
  sendSuccess(res, await service.listPrinterJobs(req.params.printerId));
}

export async function reprint(req: AuthRequest, res: Response) {
  const result = await service.reprintJob(req.params.printerId, req.params.jobId, req.user!.sub, ctxFromRequest(req, req.user!.sub));
  sendCreated(
    res,
    result,
    result.replacementCredential
      ? 'Reprint queued. Clear pending printer requests and configure the replacement credential before printing resumes.'
      : 'Reprint queued',
  );
}

async function printerForRequest(req: Request, res: Response) {
  try {
    return await service.authenticatePrinter(req.header('authorization'));
  } catch (error) {
    // CloudPRNT clients retry each of POST, GET, and DELETE with their
    // configured Basic credentials after a 401 challenge.
    res.set('WWW-Authenticate', 'Basic realm="CloudPRNT", charset="UTF-8"');
    throw error;
  }
}

export async function poll(req: Request, res: Response) {
  const printer = await printerForRequest(req, res);
  const response = await service.pollPrinter(printer, req.body);
  res.set('Cache-Control', 'no-store');
  res.json(response);
}

export async function fetch(req: Request, res: Response) {
  const printer = await printerForRequest(req, res);
  const job = await service.fetchJob(printer, req.query);
  res.set({ 'Content-Type': `${job.contentType}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.send(job.payloadText);
}

export async function complete(req: Request, res: Response) {
  const printer = await printerForRequest(req, res);
  await service.completeJob(printer, req.query);
  res.set('Cache-Control', 'no-store');
  // The CloudPRNT DELETE confirmation response has no body.
  res.status(200).end();
}