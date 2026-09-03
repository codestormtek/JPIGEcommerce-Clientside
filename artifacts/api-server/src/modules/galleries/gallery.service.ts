import { ApiError } from '../../utils/apiError';
import type {
  ListGalleriesInput,
  CreateGalleryInput,
  UpdateGalleryInput,
  AddGalleryImageInput,
  UpdateGalleryImageInput,
} from './gallery.schema';
import * as repo from './gallery.repository';

export async function listGalleries(input: ListGalleriesInput) {
  return repo.findGalleries(input);
}

export async function getPublicGalleries() {
  return repo.findPublicGalleries();
}

export async function getGalleryById(id: string) {
  const gallery = await repo.findGalleryById(id);
  if (!gallery) throw ApiError.notFound('Gallery');
  return gallery;
}

export async function getGalleryBySlug(slug: string) {
  const gallery = await repo.findGalleryBySlug(slug);
  if (!gallery) throw ApiError.notFound('Gallery');
  return gallery;
}

export async function createGallery(input: CreateGalleryInput) {
  return repo.createGallery(input);
}

export async function updateGallery(id: string, input: UpdateGalleryInput) {
  await getGalleryById(id);
  return repo.updateGallery(id, input);
}

export async function deleteGallery(id: string) {
  await getGalleryById(id);
  return repo.softDeleteGallery(id);
}

export async function addImageToGallery(galleryId: string, input: AddGalleryImageInput) {
  await getGalleryById(galleryId);
  return repo.addImage(galleryId, input);
}

export async function updateGalleryImage(galleryId: string, imageId: string, input: UpdateGalleryImageInput) {
  const image = await repo.findImageByIdAndGallery(imageId, galleryId);
  if (!image) throw ApiError.notFound('Gallery image');
  return repo.updateImage(imageId, input);
}

export async function removeGalleryImage(galleryId: string, imageId: string) {
  const image = await repo.findImageByIdAndGallery(imageId, galleryId);
  if (!image) throw ApiError.notFound('Gallery image');
  return repo.removeImage(imageId);
}
