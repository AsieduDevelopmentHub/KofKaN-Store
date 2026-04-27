"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TwoFactorRequiredError } from "@/lib/api/auth";
import { useAuth } from "@/context/AuthContext";
import { getGoogleOAuthStartUrl, isGoogleOAuthButtonEnabled } from "@/lib/oauth";
import { privacyUrl, termsUrl } from "@/lib/site";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
  totpCode: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().min(1, "Enter your name."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(50, "Username is too long.")
    .regex(/^[a-z0-9._-]*$/, "Letters, numbers, dots, underscores, or hyphens only."),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
  passwordConfirm: z.string(),
  acceptedLegal: z.boolean().refine((val) => val === true, "Accept the terms to continue."),
  rememberMe: z.boolean(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords do not match.",
  path: ["passwordConfirm"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

type Props = {
  defaultMode?: "signin" | "register";
  onSignInSuccess?: () => void;
  onRegisterSuccess?: () => void;
  onClearMessages?: () => void;
  onForgotPassword?: () => void;
};

function PasswordInputWithToggle({
  id,
  autoComplete,
  error,
  register,
}: {
  id: string;
  autoComplete?: string;
  error?: string;
  register: UseFormRegisterReturn;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mt-1">
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          {...register}
          autoComplete={autoComplete}
          className={`w-full rounded-[10px] border-0 bg-white py-3 pl-3 pr-12 text-body ring-1 transition-shadow focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${
            error
              ? "ring-red-500 focus:ring-red-500/40"
              : "ring-kofkan-gray-soft focus:ring-kofkan-gold/40 dark:ring-white/10"
          }`}
        />
        <button
          type="button"
          className="kofkan-tap-static absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-kofkan-text-muted hover:bg-black/[0.04] hover:text-kofkan-text-primary active:bg-black/[0.06] dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200 dark:active:bg-white/15"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error && <p className="mt-1 text-[0.75rem] text-red-500">{error}</p>}
    </div>
  );
}

function LegalInlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = "font-semibold text-kofkan-gold underline-offset-2 hover:underline";
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AccountAuthForm({
  defaultMode = "signin",
  onSignInSuccess,
  onRegisterSuccess,
  onClearMessages,
  onForgotPassword,
}: Props) {
  const id = useId();
  const { authError, clearAuthError, login, loginWithTotp, register } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">(defaultMode);
  const [signinStep, setSigninStep] = useState<"password" | "totp">("password");
  const [busy, setBusy] = useState(false);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { rememberMe: true, acceptedLegal: false },
  });

  const onLoginSubmit = async (data: LoginValues) => {
    clearAuthError();
    setBusy(true);
    try {
      if (signinStep === "totp") {
        await loginWithTotp(data.identifier, data.password, data.totpCode || "", data.rememberMe);
        onSignInSuccess?.();
      } else {
        try {
          await login(data.identifier, data.password, data.rememberMe);
          onSignInSuccess?.();
        } catch (err) {
          if (err instanceof TwoFactorRequiredError) {
            setSigninStep("totp");
            return;
          }
          throw err;
        }
      }
    } catch {
      // Auth error handled by context
    } finally {
      setBusy(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterValues) => {
    clearAuthError();
    setBusy(true);
    try {
      await register(
        data.username.toLowerCase(),
        data.name,
        data.password,
        data.email || undefined,
        data.rememberMe
      );
      onRegisterSuccess?.();
    } catch {
      // Auth error handled by context
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex rounded-[10px] bg-kofkan-gray-soft p-1 dark:bg-zinc-800">
        <button
          type="button"
          className={`kofkan-tap flex-1 rounded-[8px] py-2.5 text-small font-semibold ${
            mode === "signin"
              ? "bg-white text-kofkan-text-primary shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
              : "text-kofkan-text-secondary dark:text-zinc-400"
          }`}
          onClick={() => {
            setMode("signin");
            setSigninStep("password");
            clearAuthError();
            onClearMessages?.();
            loginForm.reset();
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`kofkan-tap flex-1 rounded-[8px] py-2.5 text-small font-semibold ${
            mode === "register"
              ? "bg-white text-kofkan-text-primary shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
              : "text-kofkan-text-secondary dark:text-zinc-400"
          }`}
          onClick={() => {
            setMode("register");
            clearAuthError();
            onClearMessages?.();
            registerForm.reset();
          }}
        >
          Register
        </button>
      </div>

      {isGoogleOAuthButtonEnabled() && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-black/[0.06] dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
              <span className="bg-kofkan-cream px-2 dark:bg-zinc-950">Or</span>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            className="kofkan-tap flex w-full items-center justify-center gap-2 rounded-[10px] border border-black/[0.08] bg-white py-3 text-small font-semibold text-kofkan-text-primary shadow-sm ring-1 ring-black/[0.04] hover:bg-kofkan-gray-soft/50 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10 dark:hover:bg-zinc-800"
            onClick={() => {
              window.location.href = getGoogleOAuthStartUrl();
            }}
          >
            <GoogleMark />
            Continue with Google
          </button>
        </>
      )}

      {mode === "signin" ? (
        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          <div>
            <label htmlFor={`${id}-identifier`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Email or username
            </label>
            <input
              id={`${id}-identifier`}
              {...loginForm.register("identifier")}
              disabled={busy || signinStep === "totp"}
              className={`mt-1 w-full rounded-[10px] border-0 bg-white py-3 px-3 text-body ring-1 transition-shadow focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${
                loginForm.formState.errors.identifier
                  ? "ring-red-500 focus:ring-red-500/40"
                  : "ring-kofkan-gray-soft focus:ring-kofkan-gold/40 dark:ring-white/10"
              }`}
            />
            {loginForm.formState.errors.identifier && (
              <p className="mt-1 text-[0.75rem] text-red-500">{loginForm.formState.errors.identifier.message}</p>
            )}
          </div>

          {signinStep === "password" ? (
            <>
              <div>
                <label htmlFor={`${id}-password`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                  Password
                </label>
                <PasswordInputWithToggle
                  id={`${id}-password`}
                  autoComplete="current-password"
                  error={loginForm.formState.errors.password?.message}
                  register={loginForm.register("password")}
                />
                {onForgotPassword && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      className="text-small font-semibold text-kofkan-gold hover:underline"
                      onClick={onForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-small text-kofkan-text-primary dark:text-zinc-200">
                <input
                  type="checkbox"
                  {...loginForm.register("rememberMe")}
                  className="mt-1 h-4 w-4 shrink-0 accent-kofkan-gold"
                />
                <span className="leading-relaxed">Keep me signed in on this device.</span>
              </label>
            </>
          ) : (
            <div>
              <p className="mb-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
                Enter the 6-digit code from your authenticator app.
              </p>
              <label htmlFor={`${id}-totp`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                Authentication code
              </label>
              <input
                id={`${id}-totp`}
                {...loginForm.register("totpCode")}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1 w-full rounded-[10px] border-0 bg-white py-3 px-3 text-body tracking-widest ring-1 ring-kofkan-gray-soft focus:ring-2 focus:ring-kofkan-gold/40 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                placeholder="000000"
              />
              <button
                type="button"
                className="mt-2 text-small font-semibold text-kofkan-gold"
                onClick={() => setSigninStep("password")}
              >
                Back to password
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3 text-small font-semibold text-white disabled:opacity-60"
          >
            {busy ? (signinStep === "totp" ? "Verifying…" : "Signing in…") : (signinStep === "totp" ? "Verify and sign in" : "Sign in")}
          </button>
        </form>
      ) : (
        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
          <div>
            <label htmlFor={`${id}-name`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Name
            </label>
            <input
              id={`${id}-name`}
              {...registerForm.register("name")}
              className={`mt-1 w-full rounded-[10px] border-0 bg-white py-3 px-3 text-body ring-1 transition-shadow focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${
                registerForm.formState.errors.name
                  ? "ring-red-500 focus:ring-red-500/40"
                  : "ring-kofkan-gray-soft focus:ring-kofkan-gold/40 dark:ring-white/10"
              }`}
            />
            {registerForm.formState.errors.name && (
              <p className="mt-1 text-[0.75rem] text-red-500">{registerForm.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-username`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Username
            </label>
            <input
              id={`${id}-username`}
              {...registerForm.register("username")}
              className={`mt-1 w-full rounded-[10px] border-0 bg-white py-3 px-3 text-body ring-1 transition-shadow focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${
                registerForm.formState.errors.username
                  ? "ring-red-500 focus:ring-red-500/40"
                  : "ring-kofkan-gray-soft focus:ring-kofkan-gold/40 dark:ring-white/10"
              }`}
            />
            {registerForm.formState.errors.username && (
              <p className="mt-1 text-[0.75rem] text-red-500">{registerForm.formState.errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-register-email`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Email (optional)
            </label>
            <input
              id={`${id}-register-email`}
              type="email"
              {...registerForm.register("email")}
              className={`mt-1 w-full rounded-[10px] border-0 bg-white py-3 px-3 text-body ring-1 transition-shadow focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 ${
                registerForm.formState.errors.email
                  ? "ring-red-500 focus:ring-red-500/40"
                  : "ring-kofkan-gray-soft focus:ring-kofkan-gold/40 dark:ring-white/10"
              }`}
            />
            {registerForm.formState.errors.email && (
              <p className="mt-1 text-[0.75rem] text-red-500">{registerForm.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-password-reg`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Password <span className="font-normal text-kofkan-text-muted dark:text-zinc-500">(min. 8 characters)</span>
            </label>
            <PasswordInputWithToggle
              id={`${id}-password-reg`}
              autoComplete="new-password"
              error={registerForm.formState.errors.password?.message}
              register={registerForm.register("password")}
            />
          </div>

          <div>
            <label htmlFor={`${id}-password-confirm`} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Confirm password
            </label>
            <PasswordInputWithToggle
              id={`${id}-password-confirm`}
              autoComplete="new-password"
              error={registerForm.formState.errors.passwordConfirm?.message}
              register={registerForm.register("passwordConfirm")}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-small text-kofkan-text-primary dark:text-zinc-200">
            <input
              type="checkbox"
              {...registerForm.register("acceptedLegal")}
              className="mt-1 h-4 w-4 shrink-0 accent-kofkan-gold"
            />
            <span className="leading-relaxed">
              I agree to the{" "}
              <LegalInlineLink href={termsUrl()}>Terms of Service</LegalInlineLink> and{" "}
              <LegalInlineLink href={privacyUrl()}>Privacy Policy</LegalInlineLink>.
            </span>
          </label>
          {registerForm.formState.errors.acceptedLegal && (
            <p className="mt-[-12px] text-[0.75rem] text-red-500">{registerForm.formState.errors.acceptedLegal.message}</p>
          )}

          <label className="flex cursor-pointer items-start gap-3 text-small text-kofkan-text-primary dark:text-zinc-200">
            <input
              type="checkbox"
              {...registerForm.register("rememberMe")}
              className="mt-1 h-4 w-4 shrink-0 accent-kofkan-gold"
            />
            <span className="leading-relaxed">Keep me signed in on this device.</span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3 text-small font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      {authError && (
        <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-small text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100" role="alert">
          {authError}
        </p>
      )}
    </>
  );
}
