import { Request, Response } from 'express';
import * as service from './shipping.service';
import { GetRatesInput } from './shipping.schema';

export async function getShippingRates(req: Request, res: Response) {
  const input = req.body as GetRatesInput;
  const result = await service.getShippingRates(input);
  res.json({ success: true, data: result });
}

export async function getShippingConfig(_req: Request, res: Response) {
  const result = service.getShippingConfig();
  res.json({ success: true, data: result });
}
