import { apiPost, apiGet } from "./api";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface RegisterData {
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  website?: string;
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

export async function login(emailAddress: string, password: string): Promise<AuthTokens> {
  const res = await apiPost<ApiResponse<AuthTokens>>("/auth/login", { emailAddress, password });
  return unwrap(res);
}

export async function register(data: RegisterData): Promise<AuthTokens> {
  const res = await apiPost<ApiResponse<AuthTokens>>("/auth/register", data);
  return unwrap(res);
}

export async function forgotPassword(emailAddress: string): Promise<void> {
  await apiPost("/auth/forgot-password", { emailAddress });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiPost("/auth/reset-password", { token, password });
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const res = await apiPost<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken });
  return unwrap(res);
}

export async function logout(refreshToken: string): Promise<void> {
  await apiPost("/auth/logout", { refreshToken });
}

export async function getMe(accessToken: string) {
  const res = await apiGet<ApiResponse<unknown>>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(res);
}
