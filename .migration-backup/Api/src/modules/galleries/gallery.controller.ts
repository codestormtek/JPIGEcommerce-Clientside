import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import type {
  ListGalleriesInput,
  CreateGalleryInput,
  UpdateGalleryInput,
  AddGalleryImageInput,
  UpdateGalleryImageInput,
} from './gallery.schema';
import * as service from './gallery.service';

export async function getPublicGalleries(_req: Request, res: Response): Promise<void> {
  const galleries = await service.getPublicGalleries();
  sendSuccess(res, galleries);
}

export async function getPublicGalleryBySlug(req: Request, res: Response): Promise<void> {
  const gallery = await service.getGalleryBySlug(req.params['slug'] as string);
  sendSuccess(res, gallery);
}

export async function listGalleries(req: Request, res: Response): Promise<void> {
  const result = await service.listGalleries(req.query as unknown as ListGalleriesInput);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: {
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    },
  });
}

export async function getGalleryById(req: Request, res: Response): Promise<void> {
  const gallery = await service.getGalleryById(req.params['id'] as string);
  sendSuccess(res, gallery);
}

export async function createGallery(req: AuthRequest, res: Response): Promise<void> {
  const gallery = await service.createGallery(req.body as CreateGalleryInput);
  sendCreated(res, gallery, 'Gallery created');
}

export async function updateGallery(req: AuthRequest, res: Response): Promise<void> {
  const gallery = await service.updateGallery(req.params['id'] as string, req.body as UpdateGalleryInput);
  sendSuccess(res, gallery, 'Gallery updated');
}

export async function deleteGallery(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteGallery(req.params['id'] as string);
  sendNoContent(res);
}

export async function addImage(req: AuthRequest, res: Response): Promise<void> {
  const image = await service.addImageToGallery(req.params['id'] as string, req.body as AddGalleryImageInput);
  sendCreated(res, image, 'Image added to gallery');
}

export async function updateImage(req: AuthRequest, res: Response): Promise<void> {
  const image = await service.updateGalleryImage(req.params['id'] as string, req.params['imageId'] as string, req.body as UpdateGalleryImageInput);
  sendSuccess(res, image, 'Gallery image updated');
}

export async function removeImage(req: AuthRequest, res: Response): Promise<void> {
  await service.removeGalleryImage(req.params['id'] as string, req.params['imageId'] as string);
  sendNoContent(res);
}
