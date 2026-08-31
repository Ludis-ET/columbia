/**
 * Cloudflare Turnstile.
 *
 * Chosen over reCAPTCHA for three reasons that matter for this audience:
 * it is usually invisible, it sets no tracking cookie (which is why this site
 * needs no cookie banner), and it does not ask an 82-year-old to identify
 * traffic lights.
 *
 * When the keys are absent, verification is SKIPPED rather than failing closed.
 * Losing a real family's enquiry because a spam check was misconfigured is far
 * worse than letting a spam message through — the honeypot still catches naive
 * bots, and the owner can delete anything that slips past.
 */

const SECRET = process.env.TURNSTILE_SECRET_KEY;

export const isTurnstileConfigured = Boolean(SECRET && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  if (!SECRET) {
    if (token) console.warn("[turnstile] token received but TURNSTILE_SECRET_KEY is not set.");
    return true; // Fail open — see the note above.
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret: SECRET, response: token });
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };

    if (!data.success) {
      console.warn("[turnstile] verification failed:", data["error-codes"]);
    }
    return Boolean(data.success);
  } catch (error) {
    // Cloudflare unreachable. Fail open rather than lose the enquiry.
    console.warn("[turnstile] verification threw, allowing submission:", error);
    return true;
  }
}
