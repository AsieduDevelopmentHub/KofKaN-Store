export function friendlyHttpStatus(status: number): string {
  switch (status) {
    case 400:
      return "That request could not be completed.";
    case 401:
      return "Please sign in again.";
    case 403:
      return "You do not have access to that.";
    case 404:
      return "That was not found.";
    case 422:
      return "Please check your input and try again.";
    case 429:
      return "Too many attempts. Wait a moment and try again.";
    default:
      if (status >= 500) return "Something went wrong on our side. Try again shortly.";
      return "Something went wrong. Try again.";
  }
}

export function parseApiErrorBody(status: number, bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) return friendlyHttpStatus(status);
  try {
    const j = JSON.parse(trimmed) as { detail?: unknown; message?: unknown };
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
    const d = j.detail;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0] as { msg?: string };
      if (typeof first.msg === "string" && first.msg.trim()) return first.msg.trim();
    }
  } catch {
    /* ignore non-JSON */
  }
  return friendlyHttpStatus(status);
}
