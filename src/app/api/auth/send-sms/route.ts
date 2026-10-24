import { getTranslations } from "next-intl/server";
import { isSmsConfigured, sendSms } from "@/lib/sms/africastalking";
import { verifyWebhook } from "@/lib/sms/webhook";

/*
 * Supabase Auth "Send SMS" hook: Supabase calls this with the sign-in code
 * instead of texting it through Twilio, and we send it with Africa's Talking.
 * Set it in Supabase under Authentication → Hooks → Send SMS (HTTPS) with
 * this URL, and put the secret it shows in SEND_SMS_HOOK_SECRET.
 * The code and phone number are never logged.
 */

const fail = (status: number, message: string) =>
  Response.json({ error: { http_code: status, message } }, { status });

export async function POST(request: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret || !isSmsConfigured()) return fail(503, "SMS is not set up");

  const body = await request.text();
  const ok = verifyWebhook(
    secret,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    body,
  );
  if (!ok) return fail(401, "Invalid signature");

  let phone: string | undefined;
  let otp: string | undefined;
  try {
    const payload = JSON.parse(body) as { user?: { phone?: string }; sms?: { otp?: string } };
    phone = payload.user?.phone;
    otp = payload.sms?.otp;
  } catch {
    return fail(400, "Invalid payload");
  }
  if (!phone || !otp || !/^\d{6}$/.test(otp)) return fail(400, "Invalid payload");
  const to = phone.startsWith("+") ? phone : `+${phone}`;

  // Both languages: the hook doesn't say which one the person chose.
  const [en, sw] = await Promise.all([
    getTranslations({ locale: "en", namespace: "sms" }),
    getTranslations({ locale: "sw", namespace: "sms" }),
  ]);
  const [result] = await sendSms(
    [to],
    `${en("code", { code: otp })}\n${sw("code", { code: otp })}`,
  );
  return result?.sent
    ? Response.json({})
    : fail(502, "The SMS provider did not accept the message");
}
