import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiAuthGet, apiAuthPost, apiAuthPatch, apiAuthDelete } from "@/lib/api";

export interface CampaignMedia {
  id: string;
  url: string;
  altText: string | null;
}

export interface CampaignProductItem {
  id: string;
  sku: string;
  price: number;
  qtyInStock: number;
}

export interface CampaignProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  items: CampaignProductItem[];
}

export interface KioskCampaign {
  id: string;
  name: string;
  description: string | null;
  title: string | null;
  body: string | null;
  campaignType: "upsell" | "post_sale_ad";
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  amountOff: number | null;
  mediaAssetId: string | null;
  image: CampaignMedia | null;
  imageUrl: string | null;
  durationSeconds: number;
  allKiosks: boolean;
  createdAt: string;
  updatedAt: string;
  products: CampaignProduct[];
}

export type CreateCampaignInput = Omit<
  KioskCampaign,
  "id" | "createdAt" | "updatedAt" | "image" | "imageUrl" | "products"
> & { productIds: string[] };

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

const QUERY_KEY = ["kiosk-campaigns"];

export function useKioskCampaigns() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiAuthGet<{ data: KioskCampaign[] }>("/kiosk/campaigns");
      return res.data ?? (res as unknown as KioskCampaign[]);
    },
  });
}

export function useCreateKioskCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCampaignInput) => {
      const res = await apiAuthPost<{ data: KioskCampaign }>("/kiosk/campaigns", data);
      return res.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateKioskCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCampaignInput }) => {
      const res = await apiAuthPatch<{ data: KioskCampaign }>(`/kiosk/campaigns/${id}`, data);
      return res.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteKioskCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiAuthDelete(`/kiosk/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
