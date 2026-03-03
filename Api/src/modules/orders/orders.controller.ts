import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';
import { ListOrdersInput, PlaceOrderInput, UpdateOrderStatusInput, EmailInvoiceInput } from './orders.schema';
import { ctxFromRequest } from '../../utils/auditLogger';
import * as service from './orders.service';

// ─── User-facing ──────────────────────────────────────────────────────────────

export async function listMyOrders(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const result = await service.listMyOrders(userId, req.query as unknown as ListOrdersInput);
  sendPaginated(res, result);
}

export async function getMyOrder(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const orderId = req.params['id'] as string;
  const order = await service.getMyOrderById(orderId, userId);
  sendSuccess(res, order);
}

export async function placeOrder(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const order = await service.checkout(userId, req.body as PlaceOrderInput, ctxFromRequest(req, userId));
  sendCreated(res, order, 'Order placed successfully');
}

// ─── Admin-facing ─────────────────────────────────────────────────────────────

export async function listAllOrders(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listAllOrders(req.query as unknown as ListOrdersInput);
  sendPaginated(res, result);
}

export async function getOrderById(req: AuthRequest, res: Response): Promise<void> {
  const order = await service.getOrderById(req.params['id'] as string);
  sendSuccess(res, order);
}

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.sub;
  const orderId = req.params['id'] as string;
  const order = await service.changeOrderStatus(
    orderId,
    req.body as UpdateOrderStatusInput,
    adminId,
    ctxFromRequest(req, adminId),
  );
  sendSuccess(res, order, 'Order status updated');
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getMyInvoice(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const orderId = req.params['id'] as string;
  const invoice = await service.getMyInvoice(orderId, userId);
  sendSuccess(res, invoice);
}

export async function getAdminInvoice(req: AuthRequest, res: Response): Promise<void> {
  const orderId = req.params['id'] as string;
  const invoice = await service.getAdminInvoice(orderId);
  sendSuccess(res, invoice);
}

// POST /api/v1/orders/admin/:id/email-invoice
export async function emailInvoice(req: AuthRequest, res: Response): Promise<void> {
  const orderId = req.params['id'] as string;
  const { emailTo } = req.body as EmailInvoiceInput;
  const result = await service.emailInvoice(orderId, emailTo);
  sendSuccess(res, result, `Invoice emailed to ${emailTo}`);
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function listStatuses(_req: AuthRequest, res: Response): Promise<void> {
  const statuses = await service.listStatuses();
  sendSuccess(res, statuses);
}

export async function listShippingMethods(_req: AuthRequest, res: Response): Promise<void> {
  const methods = await service.listShippingMethods();
  sendSuccess(res, methods);
}

