import "server-only";

/*
 * Africa's Talking SMS (CLAUDE.md: the SMS provider for Kenya).
 * Credentials come from env vars only and are never logged:
 *   AFRICASTALKING_USERNAME   "sandbox" for the test sandbox, else the app username
 *   AFRICASTALKING_API_KEY
 *   AFRICASTALKING_SENDER_ID  optional registered sender ID (alphanumeric or short code)
 * Request format follows Africa's Talking's official Node SDK: a form POST to
 * /version1/messaging that answers 201 with a status per recipient.
 */

export function isSmsConfigured() {
  return Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY);
}

export interface SmsResult {
  phone: string;
  sent: boolean;
}

// 100 Processed, 101 Sent, 102 Queued: accepted for delivery.
const ACCEPTED = new Set([100, 101, 102]);
const BATCH = 100;

/** Sends one message to each number ("+2547…"). Never throws for a provider refusal. */
export async function sendSms(phones: string[], message: string): Promise<SmsResult[]> {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  if (!username || !apiKey) throw new Error("SMS is not set up");
  const host =
    username.toLowerCase() === "sandbox"
      ? "api.sandbox.africastalking.com"
      : "api.africastalking.com";

  const results: SmsResult[] = [];
  for (let i = 0; i < phones.length; i += BATCH) {
    const batch = phones.slice(i, i + BATCH);
    const form = new URLSearchParams({ username, to: batch.join(","), message, bulkSMSMode: "1" });
    const sender = process.env.AFRICASTALKING_SENDER_ID;
    if (sender) form.set("from", sender);

    let accepted = new Set<string>();
    try {
      const res = await fetch(`https://${host}/version1/messaging`, {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 201) {
        const data = (await res.json()) as {
          SMSMessageData?: { Recipients?: { number: string; statusCode: number }[] };
        };
        accepted = new Set(
          (data.SMSMessageData?.Recipients ?? [])
            .filter((r) => ACCEPTED.has(r.statusCode))
            .map((r) => r.number),
        );
      } else {
        console.error("Africa's Talking refused a batch:", res.status);
      }
    } catch (e) {
      console.error("Africa's Talking request failed:", e instanceof Error ? e.name : "error");
    }
    results.push(...batch.map((phone) => ({ phone, sent: accepted.has(phone) })));
  }
  return results;
}
