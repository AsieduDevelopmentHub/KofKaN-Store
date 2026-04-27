export const STORAGE_ACCESS = "kofkan_access_token";
export const STORAGE_REFRESH = "kofkan_refresh_token";

const STORAGE_BUCKET = "kofkan_auth_bucket";

export type AuthBucket = "local" | "session";

function getStorageForBucket(bucket: AuthBucket): Storage {
  return bucket === "session" ? sessionStorage : localStorage;
}

export function getActiveBucket(): AuthBucket {
  if (typeof window === "undefined") return "local";
  const b = localStorage.getItem(STORAGE_BUCKET);
  if (b === "session" || b === "local") return b;
  if (localStorage.getItem(STORAGE_ACCESS)) return "local";
  if (sessionStorage.getItem(STORAGE_ACCESS)) return "session";
  return "local";
}

export function readTokens(): { access: string | null; refresh: string | null } {
  const bucket = getActiveBucket();
  const s = getStorageForBucket(bucket);
  return {
    access: s.getItem(STORAGE_ACCESS),
    refresh: s.getItem(STORAGE_REFRESH),
  };
}

export function writeTokens(
  access: string,
  refresh: string | null | undefined,
  bucket: AuthBucket
): void {
  const primary = getStorageForBucket(bucket);
  const secondary = bucket === "local" ? sessionStorage : localStorage;
  secondary.removeItem(STORAGE_ACCESS);
  secondary.removeItem(STORAGE_REFRESH);
  try {
    localStorage.setItem(STORAGE_BUCKET, bucket);
    primary.setItem(STORAGE_ACCESS, access);
    if (refresh) primary.setItem(STORAGE_REFRESH, refresh);
    else primary.removeItem(STORAGE_REFRESH);
  } catch {
    /* ignore */
  }
}

export function clearAllAuthTokens(): void {
  try {
    localStorage.removeItem(STORAGE_ACCESS);
    localStorage.removeItem(STORAGE_REFRESH);
    sessionStorage.removeItem(STORAGE_ACCESS);
    sessionStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_BUCKET);
  } catch {
    /* ignore */
  }
}
