import { apiGet } from "@/lib/api";
import { Product } from "@/types/api";
import ProductDetailClient from "./ProductDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product: Product | null = null;
  let fetchError: string | null = null;

  try {
    const raw = await apiGet<any>(`/products/${slug}`);
    if (raw && typeof raw === "object" && "data" in raw) {
      product = raw.data as Product | null;
    } else {
      product = raw as Product;
    }
  } catch (err: any) {
    fetchError = err.message || "Failed to load product";
  }

  return <ProductDetailClient product={product} error={fetchError} />;
}
