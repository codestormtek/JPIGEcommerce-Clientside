import { useQuery } from "@tanstack/react-query";
import { apiAuthGet } from "@/lib/api";

export interface MediaAsset {
  id: string;
  url: string;
  altText: string | null;
}

export function useMediaAssets() {
  return useQuery({
    queryKey: ["media"],
    queryFn: async () => {
      const res = await apiAuthGet<{ data: MediaAsset[] }>("/media");
      return res.data ?? (res as unknown as MediaAsset[]);
    },
  });
}

export interface Product {
  id: string;
  name: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await apiAuthGet<{ data: Product[] }>("/products");
      return res.data ?? (res as unknown as Product[]);
    },
  });
}
