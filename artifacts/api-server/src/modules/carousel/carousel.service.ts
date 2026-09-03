import { ApiError } from '../../utils/apiError';
import { ListSlidesInput, CreateSlideInput, UpdateSlideInput } from './carousel.schema';
import * as repo from './carousel.repository';

export async function listSlides(input: ListSlidesInput) {
  return repo.findSlides(input);
}

export async function getPublicSlides() {
  return repo.findPublicSlides();
}

export async function getSlideById(id: string) {
  const slide = await repo.findSlideById(id);
  if (!slide) throw ApiError.notFound('Carousel slide');
  return slide;
}

export async function createSlide(input: CreateSlideInput) {
  return repo.createSlide(input);
}

export async function updateSlide(id: string, input: UpdateSlideInput) {
  await getSlideById(id);
  return repo.updateSlide(id, input);
}

export async function deleteSlide(id: string) {
  await getSlideById(id);
  return repo.softDeleteSlide(id);
}

