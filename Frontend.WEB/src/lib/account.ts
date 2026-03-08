import { apiFetch, buildQS } from "./api";
import type {
  UserProfile,
  ContactPreference,
  ShopOrder,
  OrderInvoice,
  UserReview,
  PaginatedResponse,
} from "../types/api";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(res: ApiResponse<T> | T): T {
  if (res && typeof res === "object" && "data" in res && "success" in res) {
    const apiRes = res as ApiResponse<T>;
    if (!apiRes.success) {
      throw new Error(apiRes.message || "Request failed");
    }
    if (!apiRes.data) {
      throw new Error(apiRes.message || "No data returned");
    }
    return apiRes.data;
  }
  return res as T;
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("jpig_access_token")
      : null;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export async function getMyProfile(): Promise<UserProfile> {
  const res = await apiFetch<ApiResponse<UserProfile>>("/users/me", {
    headers: authHeaders(),
  });
  return unwrap(res);
}

export async function updateMyProfile(data: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}): Promise<UserProfile> {
  const res = await apiFetch<ApiResponse<UserProfile>>("/users/me", {
    method: "PATCH",
    body: data,
    headers: authHeaders(),
  });
  return unwrap(res);
}

interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  message?: string;
}

function unwrapPaginated<T>(res: PaginatedApiResponse<T>): PaginatedResponse<T> {
  if (!res.success) throw new Error(res.message || 'Request failed');
  return {
    data: res.data,
    total: res.meta.total,
    page: res.meta.page,
    limit: res.meta.limit,
    totalPages: res.meta.totalPages,
  };
}

export async function getMyOrders(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<ShopOrder>> {
  const qs = buildQS({ page, limit });
  const res = await apiFetch<PaginatedApiResponse<ShopOrder>>(
    `/orders${qs}`,
    { headers: authHeaders() }
  );
  return unwrapPaginated(res);
}

export async function getOrderInvoice(orderId: string): Promise<OrderInvoice> {
  const res = await apiFetch<ApiResponse<OrderInvoice>>(
    `/orders/${orderId}/invoice`,
    { headers: authHeaders() }
  );
  return unwrap(res);
}

export async function getMyContactPreferences(): Promise<ContactPreference> {
  const res = await apiFetch<ApiResponse<ContactPreference>>(
    "/users/me/contact-preferences",
    { headers: authHeaders() }
  );
  return unwrap(res);
}

export async function updateMyContactPreferences(data: {
  optInEmail?: boolean;
  optInSms?: boolean;
  smsPhone?: string;
}): Promise<ContactPreference> {
  const res = await apiFetch<ApiResponse<ContactPreference>>(
    "/users/me/contact-preferences",
    { method: "PATCH", body: data, headers: authHeaders() }
  );
  return unwrap(res);
}

export async function getMyReviews(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<UserReview>> {
  const qs = buildQS({ page, limit });
  const res = await apiFetch<PaginatedApiResponse<UserReview>>(
    `/users/me/reviews${qs}`,
    { headers: authHeaders() }
  );
  return unwrapPaginated(res);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  const res = await apiFetch<ApiResponse<unknown>>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword, confirmPassword },
    headers: authHeaders(),
  });
  unwrap(res);
}
