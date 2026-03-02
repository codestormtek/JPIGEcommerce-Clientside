import { ApiError } from '../../utils/apiError';
import {
  ListLocationsInput, CreateLocationInput, UpdateLocationInput,
  ListEventsInput, CreateEventInput, UpdateEventInput,
} from './locations.schema';
import * as repo from './locations.repository';

// ─── Locations ────────────────────────────────────────────────────────────────

export async function listLocations(input: ListLocationsInput) {
  return repo.findLocations(input);
}

export async function getLocationById(id: string) {
  const loc = await repo.findLocationById(id);
  if (!loc) throw ApiError.notFound('Location');
  return loc;
}

export async function createLocation(input: CreateLocationInput) {
  return repo.createLocation(input);
}

export async function updateLocation(id: string, input: UpdateLocationInput) {
  await getLocationById(id);
  return repo.updateLocation(id, input);
}

export async function deleteLocation(id: string) {
  await getLocationById(id);
  return repo.deleteLocation(id);
}

// ─── ScheduleEvents ───────────────────────────────────────────────────────────

export async function listEvents(input: ListEventsInput) {
  return repo.findEvents(input);
}

export async function getEventById(id: string) {
  const event = await repo.findEventById(id);
  if (!event) throw ApiError.notFound('Schedule event');
  return event;
}

export async function createEvent(userId: string, input: CreateEventInput) {
  // Validate that the location exists and is active
  const loc = await repo.findLocationById(input.locationId);
  if (!loc) throw ApiError.notFound('Location');
  if (!loc.isActive) throw ApiError.badRequest('Location is not active');
  return repo.createEvent(userId, input);
}

export async function updateEvent(id: string, userId: string, input: UpdateEventInput) {
  await getEventById(id);
  if (input.locationId) {
    const loc = await repo.findLocationById(input.locationId);
    if (!loc) throw ApiError.notFound('Location');
    if (!loc.isActive) throw ApiError.badRequest('Location is not active');
  }
  return repo.updateEvent(id, userId, input);
}

export async function deleteEvent(id: string) {
  await getEventById(id);
  return repo.softDeleteEvent(id);
}

