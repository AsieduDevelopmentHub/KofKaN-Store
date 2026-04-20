import { apiGet, apiPost } from "@/lib/api/client";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export function register(payload: { email: string; full_name: string; password: string }) {
  return apiPost<AuthResponse>("/auth/register", payload);
}

export function login(payload: { email: string; password: string }) {
  return apiPost<AuthResponse>("/auth/login", payload);
}

export function fetchProfile(token: string) {
  return apiGet<AuthUser>("/auth/profile", token);
}

export function googleOauthUrl() {
  return apiGet<{ provider: string; url: string }>("/auth/google/url");
}

export function completeGoogleLogin(payload: { email: string; name: string; sub: string }) {
  const search = new URLSearchParams({
    email: payload.email,
    name: payload.name,
    sub: payload.sub
  });
  return apiGet<AuthResponse>(`/auth/google/callback?${search.toString()}`);
}
