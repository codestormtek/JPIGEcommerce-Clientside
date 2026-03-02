import { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { AuthRequest } from '../../types';
import {
  ListLocationsInput, CreateLocationInput, UpdateLocationInput,
  ListEventsInput, CreateEventInput, UpdateEventInput,
} from './locations.schema';
import * as service from './locations.service';

// ─── Locations ────────────────────────────────────────────────────────────────

// GET /api/v1/locations
export async function listLocations(req: Request, res: Response): Promise<void> {
  const result = await service.listLocations(req.query as unknown as ListLocationsInput);
  sendPaginated(res, result);
}

// GET /api/v1/locations/:id
export async function getLocationById(req: Request, res: Response): Promise<void> {
  const loc = await service.getLocationById(req.params['id'] as string);
  sendSuccess(res, loc);
}

// POST /api/v1/locations
export async function createLocation(req: Request, res: Response): Promise<void> {
  const loc = await service.createLocation(req.body as CreateLocationInput);
  sendCreated(res, loc, 'Location created');
}

// PATCH /api/v1/locations/:id
export async function updateLocation(req: Request, res: Response): Promise<void> {
  const loc = await service.updateLocation(req.params['id'] as string, req.body as UpdateLocationInput);
  sendSuccess(res, loc, 'Location updated');
}

// DELETE /api/v1/locations/:id
export async function deleteLocation(req: Request, res: Response): Promise<void> {
  await service.deleteLocation(req.params['id'] as string);
  sendNoContent(res);
}

// ─── ScheduleEvents ───────────────────────────────────────────────────────────

// GET /api/v1/locations/events
export async function listEvents(req: Request, res: Response): Promise<void> {
  const result = await service.listEvents(req.query as unknown as ListEventsInput);
  sendPaginated(res, result);
}

// GET /api/v1/locations/events/:id
export async function getEventById(req: Request, res: Response): Promise<void> {
  const event = await service.getEventById(req.params['id'] as string);
  sendSuccess(res, event);
}

// POST /api/v1/locations/events
export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
  const event = await service.createEvent(req.user!.sub, req.body as CreateEventInput);
  sendCreated(res, event, 'Schedule event created');
}

// PATCH /api/v1/locations/events/:id
export async function updateEvent(req: AuthRequest, res: Response): Promise<void> {
  const event = await service.updateEvent(req.params['id'] as string, req.user!.sub, req.body as UpdateEventInput);
  sendSuccess(res, event, 'Schedule event updated');
}

// DELETE /api/v1/locations/events/:id
export async function deleteEvent(req: Request, res: Response): Promise<void> {
  await service.deleteEvent(req.params['id'] as string);
  sendNoContent(res);
}

