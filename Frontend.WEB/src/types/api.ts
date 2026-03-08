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

export interface ContentPostAuthor {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
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
  featuredMediaAsset: MediaAsset | null;
  authorUser?: ContentPostAuthor | null;
  categories: { id?: string; name?: string; category?: { id: string; name: string; slug?: string } }[];
  tags: { id?: string; name?: string; tag?: { id: string; name: string; slug?: string } }[];
}

export interface CarouselSlide {
  id: string;
  title: string | null;
  subTitle: string | null;
  subtitle?: string | null;
  buttonUrl: string | null;
  buttonText: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  displayOrder: number;
  isVisible: boolean;
  isActive?: boolean;
  mediaAsset: MediaAsset | null;
  mobileMediaAsset: MediaAsset | null;
  desktopImage?: MediaAsset | null;
  mobileImage?: MediaAsset | null;
}

export interface UserAddress {
  id: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  isDefault: boolean;
  addressType: string | null;
}

export interface ContactPreference {
  optInEmail: boolean;
  optInSms: boolean;
  smsPhone: string | null;
  preferredLanguage: string | null;
  timezone: string | null;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  contactPreference: ContactPreference | null;
  userAddresses: UserAddress[];
  _count: Record<string, number>;
}

export interface OrderLine {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  product?: { id: string; name: string };
}

export interface OrderStatus {
  id: string;
  name: string;
}

export interface ShopOrder {
  id: string;
  orderDate: string;
  orderStatusId: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  orderType: string | null;
  orderStatus: OrderStatus;
  lines: OrderLine[];
}

export interface InvoiceLine {
  sku: string | null;
  name: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  options: string[];
}

export interface InvoicePayment {
  provider: string;
  amount: number;
  status: string;
  capturedAt: string | null;
}

export interface OrderInvoice {
  invoiceNumber: string;
  issuedAt: string;
  currency: string;
  status: string;
  orderType: string;
  specialInstructions: string | null;
  billTo: UserAddress | null;
  shipTo: UserAddress | null;
  shippingMethod: string | null;
  lines: InvoiceLine[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    grand: number;
  };
  payments: InvoicePayment[];
}

export interface UserReview {
  id: string;
  productId: string;
  ratingValue: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  product: { id: string; name: string };
}

export interface CommentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface ContentComment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  body: string;
  isApproved: boolean;
  createdAt: string;
  user: CommentUser;
  replies: ContentComment[];
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
