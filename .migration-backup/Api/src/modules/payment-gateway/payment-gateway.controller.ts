import { Request, Response } from 'express';
import * as svc from './payment-gateway.service';
import { ApiError } from '../../utils/apiError';

export async function getStatus(_req: Request, res: Response): Promise<void> {
  const status = await svc.getGatewayStatus();
  res.json({ success: true, data: status });
}

export async function saveConfig(req: Request, res: Response): Promise<void> {
  const { activeGateway, square } = req.body as {
    activeGateway?: string;
    square?: { appId?: string; locationId?: string; accessToken?: string };
  };

  if (activeGateway !== undefined) {
    if (activeGateway !== 'stripe' && activeGateway !== 'square') {
      throw ApiError.badRequest('activeGateway must be "stripe" or "square"');
    }
    await svc.setActiveGateway(activeGateway as svc.GatewayName);
  }

  if (square) {
    svc.applySquareCredentials(square);
  }

  const status = await svc.getGatewayStatus();
  res.json({
    success: true,
    message: 'Payment gateway configuration saved.',
    note: square ? 'Square credentials are active for this session. To make them permanent, add SQUARE_APP_ID, SQUARE_LOCATION_ID, and SQUARE_ACCESS_TOKEN as Replit Secrets.' : undefined,
    data: status,
  });
}

export async function testConnection(_req: Request, res: Response): Promise<void> {
  const result = await svc.testSquareConnection();
  res.json({ success: result.ok, message: result.message });
}
