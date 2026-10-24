import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "./webhook";

const raw = Buffer.from("a test secret of thirty-two bytes").toString("base64");
const secret = `v1,whsec_${raw}`;
const body = JSON.stringify({ user: { phone: "+254700000000" }, sms: { otp: "123456" } });
const now = 1_800_000_000_000;
const ts = String(now / 1000);

function sign(id: string, timestamp: string, content: string, key = raw) {
  return createHmac("sha256", Buffer.from(key, "base64"))
    .update(`${id}.${timestamp}.${content}`)
    .digest("base64");
}

describe("verifyWebhook", () => {
  const good = { id: "msg_1", timestamp: ts, signature: `v1,${sign("msg_1", ts, body)}` };

  it("accepts a correctly signed request", () => {
    expect(verifyWebhook(secret, good, body, now)).toBe(true);
  });

  it("accepts the secret without its prefix", () => {
    expect(verifyWebhook(raw, good, body, now)).toBe(true);
  });

  it("accepts any matching signature while a secret rotates", () => {
    const signature = `v1,${sign("msg_1", ts, body, Buffer.from("old").toString("base64"))} ${good.signature}`;
    expect(verifyWebhook(secret, { ...good, signature }, body, now)).toBe(true);
  });

  it("rejects a changed body", () => {
    expect(verifyWebhook(secret, good, body.replace("123456", "000000"), now)).toBe(false);
  });

  it("rejects another secret", () => {
    const other = `v1,whsec_${Buffer.from("another secret").toString("base64")}`;
    expect(verifyWebhook(other, good, body, now)).toBe(false);
  });

  it("rejects old or future requests", () => {
    expect(verifyWebhook(secret, good, body, now + 6 * 60_000)).toBe(false);
    expect(verifyWebhook(secret, good, body, now - 6 * 60_000)).toBe(false);
  });

  it("rejects missing headers or secret", () => {
    expect(verifyWebhook(secret, { ...good, signature: null }, body, now)).toBe(false);
    expect(verifyWebhook("", good, body, now)).toBe(false);
  });
});
