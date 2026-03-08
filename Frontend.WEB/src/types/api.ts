export interface MediaAsset {
  id: string;
  url: string;
  altText: string | null;
  mediaType: string;
}

export interface ProductMedia {
  mediaAsset: MediaAsset;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Brand {
  id: string;
  name: string;
  description: string | null;
}

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  parentCategoryId: string | null;
}

export interface ProductAttribute {
  id: string;
  name: string;
  values: { id: string; value: string; priceAdjustment: number | null }[];
}

export interface VariationOption {
  id: string;
  value: string;
  variation: { id: string; name: string };
}

export interface ProductItem {
  id: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  qtyInStock: number;
  weight: number | null;
  isPublished: boolean;
  options: { variationOption: VariationOption }[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  brandId: string | null;
  createdAt: string;
  isDeleted: boolean;
  brand: Brand | null;
  categoryMaps: { category: Category }[];
  media: ProductMedia[];
  attributes: ProductAttribute[];
  items: ProductItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContentPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  bodyHtml: string | null;
  postType: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  featuredImage: MediaAsset | null;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export interface CarouselSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  linkText: string | null;
  displayOrder: number;
  isActive: boolean;
  desktopImage: MediaAsset | null;
  mobileImage: MediaAsset | null;
}

export function getProductImage(product: Product): string {
  const primary = product.media?.find((m) => m.isPrimary);
  const first = product.media?.[0];
  return (primary || first)?.mediaAsset?.url || "/assets/images/grocery/15.jpg";
}

export function getProductSlug(product: Product): string {
  return product.id;
}

export function formatPrice(price: number | string): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return n.toFixed(2);
}
