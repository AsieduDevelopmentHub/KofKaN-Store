import { parseApiErrorBody } from "@/lib/api/error-message";
import { V1 } from "@/lib/api/v1-paths";
import { getActiveBucket, readTokens, writeTokens } from "@/lib/auth-storage";

export function getApiV1Base(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000/api/v1";
  return raw.replace(/\/$/, "");
}

export function getBackendOrigin(): string {
  const base = getApiV1Base();
  const stripped = base.replace(/\/api\/v1\/?$/i, "");
  return stripped || "http://localhost:8000";
}

/**
 * Wake a cold backend (e.g. Render free tier) by hitting `/health`.
 * Fire-and-forget; failures are ignored.
 */
export function pingBackendHealth(): void {
  if (typeof window === "undefined") return;
  const url = `${getBackendOrigin()}/health`;
  void fetch(url, {
    method: "GET",
    cache: "no-store",
    mode: "cors",
    keepalive: true,
  }).catch(() => { });
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const { refresh: rt } = readTokens();
      if (!rt) return null;
      const res = await fetch(`${getApiV1Base()}${V1.auth.refresh}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return null;
      const tokens = (await res.json()) as {
        access_token: string;
        refresh_token?: string | null;
      };
      const bucket = getActiveBucket();
      writeTokens(tokens.access_token, tokens.refresh_token ?? rt, bucket);
      window.dispatchEvent(new CustomEvent("kofkan-auth-refreshed", { detail: tokens.access_token }));
      return tokens.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }
  const text = await res.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined as T;
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const looksJson =
    ct.includes("application/json") ||
    ct.includes("+json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");
  if (!looksJson) {
    return undefined as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined as T;
  }
}

export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiV1Base()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return parseJsonResponse<T>(res);
}

/** Authorized binary response (e.g. PDF). Retries once on 401 after refresh. */
export async function apiFetchBlobAuth(
  accessToken: string | null | undefined,
  path: string,
  init?: RequestInit
): Promise<Blob> {
  if (!accessToken?.trim()) {
    throw new Error("Not authenticated");
  }
  const url = `${getApiV1Base()}${path.startsWith("/") ? path : `/${path}`}`;
  const doFetch = (tok: string) =>
    fetch(url, {
      ...init,
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${tok.trim()}`,
        ...init?.headers,
      },
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && typeof window !== "undefined") {
    const next = await refreshAccessTokenOnce();
    if (next) res = await doFetch(next);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return res.blob();
}

export async function apiFetchJsonAuth<T>(
  accessToken: string | null | undefined,
  path: string,
  init?: RequestInit,
  allowRetry = true
): Promise<T> {
  if (!accessToken?.trim()) {
    throw new Error("Not authenticated");
  }
  const url = `${getApiV1Base()}${path.startsWith("/") ? path : `/${path}`}`;
  const doFetch = (tok: string) =>
    fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tok.trim()}`,
        ...init?.headers,
      },
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && allowRetry && typeof window !== "undefined") {
    const next = await refreshAccessTokenOnce();
    if (next) res = await doFetch(next);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return parseJsonResponse<T>(res);
}

/** Authorized multipart (e.g. admin product create). Retries once on 401 after refresh. */
export async function apiFetchFormAuth<T>(
  accessToken: string | null | undefined,
  path: string,
  formData: FormData,
  method: "POST" | "PUT" = "POST",
  allowRetry = true
): Promise<T> {
  if (!accessToken?.trim()) {
    throw new Error("Not authenticated");
  }
  const url = `${getApiV1Base()}${path.startsWith("/") ? path : `/${path}`}`;
  const doFetch = (tok: string) =>
    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${tok.trim()}`,
      },
      body: formData,
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && allowRetry && typeof window !== "undefined") {
    const next = await refreshAccessTokenOnce();
    if (next) res = await doFetch(next);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return parseJsonResponse<T>(res);
}

/** PATCH/DELETE with optional JSON body. */
export async function apiFetchJsonAuthMethod<T>(
  accessToken: string | null | undefined,
  path: string,
  method: "PATCH" | "DELETE",
  body?: unknown,
  allowRetry = true
): Promise<T> {
  if (!accessToken?.trim()) {
    throw new Error("Not authenticated");
  }
  const url = `${getApiV1Base()}${path.startsWith("/") ? path : `/${path}`}`;
  const doFetch = (tok: string) =>
    fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.trim()}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(accessToken);
  if (res.status === 401 && allowRetry && typeof window !== "undefined") {
    const next = await refreshAccessTokenOnce();
    if (next) res = await doFetch(next);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return parseJsonResponse<T>(res);
}
