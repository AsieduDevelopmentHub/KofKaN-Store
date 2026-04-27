import { HelpArticle } from "@/components/help/HelpArticle";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Account & privacy", {
  description: "Manage your KofKaN account, email, password, and data — help topics and security tips.",
  path: "/help/account",
});

export default function HelpAccountPage() {
  return (
    <HelpArticle title="Account & privacy" eyebrow="Help · Account">
      <h2>Creating an account</h2>
      <p>
        Tap <strong>Account</strong> in the bottom nav, then <strong>Create account</strong>. You need a username, your
        full name, and a password. Email is optional but recommended for order updates and password recovery.
      </p>
      <h2>Forgot password?</h2>
      <p>
        From the sign-in screen, tap <em>Forgot password?</em>. We&apos;ll email you a link to set a new password. Links
        expire in 15 minutes for security.
      </p>
      <h2>Two-factor authentication</h2>
      <p>
        Add an extra layer by enabling 2FA from <strong>Account → Security</strong>. Use any authenticator app (Google
        Authenticator, Authy, 1Password). Save the backup codes in a safe place.
      </p>
      <h2>Deleting your account</h2>
      <p>
        You can close your account anytime from <strong>Account → Close account</strong>. This removes your personal
        data from our active systems in line with our privacy policy.
      </p>
    </HelpArticle>
  );
}
