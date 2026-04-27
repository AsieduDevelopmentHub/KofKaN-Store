const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizePlainText(raw: string, maxLen: number): string {
  let s = raw.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeMultiline(raw: string, maxLen: number): string {
  let s = raw.replace(/\r\n/g, "\n").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeDigits(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

export function validateEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!e) return "Enter your email.";
  if (!EMAIL_RE.test(e)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string, min = 8): string | null {
  if (password.length < min) return `Password must be at least ${min} characters.`;
  return null;
}

export function validateOtpCode(code: string, len = 6): string | null {
  const c = code.replace(/\D/g, "");
  if (c.length !== len) return `Enter the ${len}-digit code.`;
  return null;
}

export function validateReviewTitle(title: string): string | null {
  const t = sanitizePlainText(title, 200);
  if (t.length < 1) return "Add a short title.";
  if (t.length > 200) return "Title is too long.";
  return null;
}

export function validateReviewBody(body: string): string | null {
  const b = sanitizeMultiline(body, 5000);
  if (b.length < 1) return "Write a few words for your review.";
  if (b.length > 5000) return "Review is too long.";
  return null;
}

export function validateShippingAddress(addr: string): string | null {
  const a = sanitizeMultiline(addr, 2000);
  /** Short but real addresses (e.g. "12 Kanda Accra") are valid; commas are not required. */
  if (a.length < 8) return "Add a bit more detail: where to deliver (street, area, city).";
  if (a.length > 2000) return "Address is too long.";
  return null;
}

export function validatePhoneOptional(phone: string): string | null {
  const p = phone.replace(/[^\d+]/g, "").trim();
  if (!p) return null;
  if (p.length < 8 || p.length > 20) return "Check the phone number length.";
  return null;
}
