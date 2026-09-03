import * as repo from './social-links.repository';
import { CreateSocialLinkInput, UpdateSocialLinkInput } from './social-links.schema';
import { ApiError } from '../../utils/apiError';

const DEFAULT_LINKS = [
  { id: 'seed-facebook', platform: 'Facebook', iconClass: 'fa-brands fa-facebook-f', url: '#' },
  { id: 'seed-twitter', platform: 'Twitter', iconClass: 'fa-brands fa-twitter', url: '#' },
  { id: 'seed-youtube', platform: 'YouTube', iconClass: 'fa-brands fa-youtube', url: '#' },
  { id: 'seed-whatsapp', platform: 'WhatsApp', iconClass: 'fa-brands fa-whatsapp', url: '#' },
  { id: 'seed-instagram', platform: 'Instagram', iconClass: 'fa-brands fa-instagram', url: '#' },
];

let seeding: Promise<void> | null = null;

async function ensureSeeded() {
  if (seeding) return seeding;
  seeding = (async () => {
    const existing = await repo.count();
    if (existing > 0) return;
    // Deterministic IDs + skipDuplicates make this safe across concurrent
    // requests/instances: a racing insert of the same seed IDs is a no-op.
    await repo.createMany(
      DEFAULT_LINKS.map((l, i) => ({ ...l, sortOrder: i, isActive: true }))
    );
  })().finally(() => {
    seeding = null;
  });
  return seeding;
}

export async function listAll() {
  await ensureSeeded();
  return repo.findAll();
}

export async function listActive() {
  await ensureSeeded();
  return repo.findActive();
}

export async function getById(id: string) {
  return repo.findById(id);
}

export async function createLink(data: CreateSocialLinkInput) {
  if (data.sortOrder === undefined) {
    const all = await repo.findAll();
    data.sortOrder = all.length;
  }
  return repo.create(data);
}

export async function updateLink(id: string, data: UpdateSocialLinkInput) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  return repo.update(id, data);
}

export async function deleteLink(id: string) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  await repo.remove(id);
  return existing;
}

export async function reorder(ids: string[]) {
  const all = await repo.findAll();
  const currentIds = all.map((l) => l.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new ApiError(400, 'Reorder list must not contain duplicate ids');
  }
  if (ids.length !== currentIds.length || !currentIds.every((id) => unique.has(id))) {
    throw new ApiError(400, 'Reorder list must match the full set of existing links');
  }
  await repo.reorderTx(ids);
  return repo.findAll();
}
