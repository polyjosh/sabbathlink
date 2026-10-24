import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Verifies a Standard Webhooks request (https://www.standardwebhooks.com),
 * the format Supabase Auth hooks use. Written out rather than adding the
 * `standardwebhooks` package: it is one HMAC.
 *
 * Signed content: `${webhook-id}.${webhook-timestamp}.${body}`, HMAC-SHA256
 * with the base64 secret. The signature header holds one or more
 * space-separated `v1,<base64>` entries (several while a secret rotates).
 */

const TOLERANCE_SECONDS = 5 * 60;

export function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_SECONDS) return false;

  // Supabase shows the secret as "v1,whsec_<base64>".
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
