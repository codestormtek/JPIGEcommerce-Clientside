import { ContentPost } from '@/types/api';

type BlogImageSize = 'xlarge' | 'large' | 'medium' | 'small';

const FALLBACK_IMAGE = '/assets/images/blog/blog-01.jpg';

export function getBlogImageUrl(post: ContentPost, size: BlogImageSize = 'xlarge'): string {
  const url = post.featuredMediaAsset?.url || post.featuredImage?.url || '';
  if (!url) return FALLBACK_IMAGE;
  if (size === 'xlarge') return url;
  const replaced = url.replace(/_xlarge(\.[a-zA-Z]+)$/, `_${size}$1`);
  if (replaced !== url) return replaced;
  return url;
}
