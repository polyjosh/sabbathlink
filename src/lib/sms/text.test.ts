import { describe, expect, it } from "vitest";
import { SMS_MAX, smsText } from "./text";

const stop = "Stop SMS: sabbathlink.co.ke/me/messages";

describe("smsText", () => {
  it("keeps short messages whole and ends with the stop line", () => {
    expect(smsText(" Verified ", "Your church is live.", stop)).toBe(
      `SabbathLink: Verified\nYour church is live.\n${stop}`,
    );
  });

  it("shortens long messages but never drops the stop line", () => {
    const text = smsText("Notice", "x".repeat(600), stop);
    expect(text.length).toBeLessThanOrEqual(SMS_MAX);
    expect(text.endsWith(`…\n${stop}`)).toBe(true);
  });
});
