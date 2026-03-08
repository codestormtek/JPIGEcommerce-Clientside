import sharp from 'sharp';

export interface ResizeVariant {
  suffix: string;
  width: number;
  height: number;
}

export const BLOG_VARIANTS: ResizeVariant[] = [
  { suffix: 'xlarge', width: 1018, height: 657 },
  { suffix: 'large',  width: 1018, height: 622 },
  { suffix: 'medium', width: 349,  height: 213 },
  { suffix: 'small',  width: 80,   height: 80  },
];

export const PAGE_VARIANTS: ResizeVariant[] = [
  { suffix: 'xlarge', width: 1200, height: 346 },
];

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildVariantFilename(name: string, suffix: string, ext: string, uid: string): string {
  const sanitized = sanitizeName(name);
  return `${sanitized}_${uid}_${suffix}${ext}`;
}

export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toBuffer();
}
