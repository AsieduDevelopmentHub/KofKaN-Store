const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    next: { revalidate: 60 },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

type JsonBody = Record<string, unknown> | unknown[] | null;

async function request<T>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: JsonBody,
  token?: string
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function apiPost<T>(path: string, body?: JsonBody, token?: string) {
  return request<T>("POST", path, body, token);
}

export function apiPut<T>(path: string, body?: JsonBody, token?: string) {
  return request<T>("PUT", path, body, token);
}

export function apiDelete<T>(path: string, token?: string) {
  return request<T>("DELETE", path, undefined, token);
}
