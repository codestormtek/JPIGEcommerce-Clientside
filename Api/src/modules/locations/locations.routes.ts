import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listLocationsSchema,
  createLocationSchema,
  updateLocationSchema,
  listEventsSchema,
  createEventSchema,
  updateEventSchema,
} from './locations.schema';
import * as ctrl from './locations.controller';

export const locationsRouter = Router();

// ─── Static prefixes (must be before /:id) ───────────────────────────────────

// GET    /api/v1/locations/events            — list all events (public)
locationsRouter.get('/events', validate(listEventsSchema, 'query'), asyncHandler(ctrl.listEvents));

// POST   /api/v1/locations/events            — create event (admin)
locationsRouter.post('/events', authenticate, authorize('admin'), validate(createEventSchema), asyncHandler(ctrl.createEvent));

// GET    /api/v1/locations/events/:id        — get event by id (public)
locationsRouter.get('/events/:id', asyncHandler(ctrl.getEventById));

// PATCH  /api/v1/locations/events/:id        — update event (admin)
locationsRouter.patch('/events/:id', authenticate, authorize('admin'), validate(updateEventSchema), asyncHandler(ctrl.updateEvent));

// DELETE /api/v1/locations/events/:id        — soft-delete event (admin)
locationsRouter.delete('/events/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteEvent));

// ─── Locations ────────────────────────────────────────────────────────────────

// GET    /api/v1/locations                   — list locations (public)
locationsRouter.get('/', validate(listLocationsSchema, 'query'), asyncHandler(ctrl.listLocations));

// POST   /api/v1/locations                   — create location (admin)
locationsRouter.post('/', authenticate, authorize('admin'), validate(createLocationSchema), asyncHandler(ctrl.createLocation));

// GET    /api/v1/locations/:id               — get location by id (public)
locationsRouter.get('/:id', asyncHandler(ctrl.getLocationById));

// PATCH  /api/v1/locations/:id               — update location (admin)
locationsRouter.patch('/:id', authenticate, authorize('admin'), validate(updateLocationSchema), asyncHandler(ctrl.updateLocation));

// DELETE /api/v1/locations/:id               — delete location (admin)
locationsRouter.delete('/:id', authenticate, authorize('admin'), asyncHandler(ctrl.deleteLocation));

