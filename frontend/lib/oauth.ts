import { getApiV1Base } from "@/lib/api/client";

export function getGoogleOAuthStartUrl(): string {
  return `${getApiV1Base()}/auth/google/start`;
}

/** Set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false` to hide the button (e.g. staging without Google keys). */
export function isGoogleOAuthButtonEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED !== "false";
}

export function formatOAuthErrorParam(raw: string | null): string | null {
  if (!raw) return null;
  switch (raw) {
    case "config":
      return "Google sign-in is not configured on the server yet.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    case "missing_token":
      return "Could not complete sign-in. Please try again.";
    default:
      try {
        return decodeURIComponent(raw.replace(/\+/g, " "));
      } catch {
        return raw;
      }
  }
}
