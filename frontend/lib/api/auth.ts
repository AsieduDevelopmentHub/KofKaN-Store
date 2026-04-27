import { apiFetchJson, apiFetchJsonAuth, getApiV1Base } from "@/lib/api/client";
import { parseApiErrorBody } from "@/lib/api/error-message";
import { V1 } from "@/lib/api/v1-paths";

export type TokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  expires_in: number;
};

export type UserProfile = {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  email_is_placeholder?: boolean;
  phone?: string | null;
  shipping_region?: string | null;
  shipping_city?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_landmark?: string | null;
  shipping_contact_name?: string | null;
  shipping_contact_phone?: string | null;
  email_verified: boolean;
  two_fa_enabled: boolean;
  two_fa_method?: string | null;
  is_active: boolean;
  is_admin: boolean;
  admin_role?: string;
  admin_permissions?: string | null;
  created_at: string;
  updated_at: string;
};

export type RegisterUserResponse = {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  two_fa_enabled: boolean;
};

export class TwoFactorRequiredError extends Error {
  override name = "TwoFactorRequiredError";
  constructor() {
    super("two_factor_required");
  }
}

export async function authLogin(identifier: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${getApiV1Base()}${V1.auth.login}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (res.status === 403) {
    const raw = await res.text();
    let need2fa = raw.includes("two_factor_required");
    if (!need2fa) {
      try {
        const j = JSON.parse(raw) as { detail?: unknown };
        const d = j.detail;
        need2fa =
          d === "two_factor_required" ||
          (Array.isArray(d) && d.some((x) => String(x).includes("two_factor_required")));
      } catch {
        /* ignore */
      }
    }
    if (need2fa) throw new TwoFactorRequiredError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return res.json() as Promise<TokenResponse>;
}

export async function authRegister(
  username: string,
  name: string,
  password: string,
  email?: string
): Promise<RegisterUserResponse> {
  return apiFetchJson<RegisterUserResponse>(V1.auth.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      name,
      password,
      email: email || null,
    }),
  });
}

export async function authFetchProfile(accessToken: string): Promise<UserProfile> {
  return apiFetchJsonAuth<UserProfile>(accessToken, V1.auth.profile);
}

export async function authLogout(accessToken: string): Promise<void> {
  await apiFetchJsonAuth<{ message: string }>(accessToken, V1.auth.logout, {
    method: "POST",
  });
}

export async function authLoginWith2FA(
  identifier: string,
  password: string,
  code: string
): Promise<TokenResponse> {
  return apiFetchJson<TokenResponse>(V1.auth.login2fa, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password, code }),
  });
}

/** Finish Google OAuth when the account has TOTP 2FA enabled (after redirect to /auth/google/2fa). */
export async function authGoogleOAuthVerify2FA(
  pendingToken: string,
  code: string
): Promise<TokenResponse> {
  return apiFetchJson<TokenResponse>(V1.auth.googleVerify2fa, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ pending_token: pendingToken, code }),
  });
}

export async function authRefresh(refreshToken: string): Promise<TokenResponse> {
  return apiFetchJson<TokenResponse>(V1.auth.refresh, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export type TwoFASetupResponse = {
  secret: string;
  qr_code: string;
  backup_codes: string[];
};

export async function authTwoFaSetup(accessToken: string): Promise<TwoFASetupResponse> {
  return apiFetchJsonAuth<TwoFASetupResponse>(accessToken, V1.auth.twoFaSetup, {
    method: "POST",
  });
}

export async function authTwoFaEnable(
  accessToken: string,
  body: { secret: string; backup_codes: string[]; verification_code: string }
): Promise<{ message: string; two_fa_enabled: boolean; two_fa_method?: string | null }> {
  return apiFetchJsonAuth(accessToken, V1.auth.twoFaEnable, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function authTwoFaDisable(
  accessToken: string,
  password: string
): Promise<{ message: string; two_fa_enabled: boolean }> {
  return apiFetchJsonAuth(accessToken, V1.auth.twoFaDisable, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function authResendEmailVerification(accessToken: string): Promise<{ message: string }> {
  return apiFetchJsonAuth<{ message: string }>(accessToken, V1.auth.resendEmailVerification, {
    method: "POST",
  });
}

export async function authVerifyEmail(email: string, code: string): Promise<{
  message: string;
  email: string;
  verified: boolean;
}> {
  return apiFetchJson(V1.auth.verifyEmail, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}

export async function authUpdateProfile(
  accessToken: string,
  body: {
    username?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    shipping_region?: string | null;
    shipping_city?: string | null;
    shipping_address_line1?: string | null;
    shipping_address_line2?: string | null;
    shipping_landmark?: string | null;
    shipping_contact_name?: string | null;
    shipping_contact_phone?: string | null;
  }
): Promise<UserProfile> {
  return apiFetchJsonAuth<UserProfile>(accessToken, V1.auth.profilePut, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function authChangePassword(
  accessToken: string,
  current_password: string,
  new_password: string
): Promise<{ message: string }> {
  return apiFetchJsonAuth<{ message: string }>(accessToken, V1.auth.passwordChange, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password, new_password }),
  });
}

export async function authPasswordResetRequest(email: string): Promise<{ message: string }> {
  return apiFetchJson<{ message: string }>(V1.auth.passwordResetRequest, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function authPasswordResetConfirm(
  token: string,
  new_password: string
): Promise<{ message: string; email: string }> {
  return apiFetchJson<{ message: string; email: string }>(V1.auth.passwordResetConfirm, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });
}

export async function authDeleteAccount(accessToken: string, password: string): Promise<{ message: string }> {
  return apiFetchJsonAuth<{ message: string }>(accessToken, V1.auth.accountDelete, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}
