import { describe, expect, it } from "vitest";
import { formatKenyanPhone, maskKenyanPhone, normalizeKenyanPhone } from "./phone";
import { isVisible, nairobiHm, nextSabbath, toClockTime, toSwahiliTime } from "./time";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0712 345 678", "+254712345678"],
    ["712345678", "+254712345678"],
    ["+254 712 345 678", "+254712345678"],
    ["254712345678", "+254712345678"],
    ["0110-123-456", "+254110123456"],
  ])("normalises %s", (input, out) => {
    expect(normalizeKenyanPhone(input)).toBe(out);
  });

  it.each(["", "12345", "0812345678", "+1 415 555 0100", "07123456789", "07I2345678"])(
    "rejects %s",
    (input) => {
      expect(normalizeKenyanPhone(input)).toBeNull();
    },
  );

  it("formats and masks", () => {
    expect(formatKenyanPhone("+254712345678")).toBe("+254 712 345 678");
    expect(maskKenyanPhone("+254733000412")).toBe("+254 733 *** 412");
  });
});

describe("Swahili time", () => {
  it.each([
    ["08:30", "2:30", "asubuhi"],
    ["11:00", "5:00", "asubuhi"],
    ["14:30", "8:30", "mchana"],
    ["15:00", "9:00", "alasiri"],
    ["18:15", "12:15", "jioni"],
    ["19:00", "1:00", "usiku"],
  ])("%s is saa %s %s", (hm, time, period) => {
    expect(toSwahiliTime(hm)).toEqual({ time, period });
  });

  it("formats English clock time", () => {
    expect(toClockTime("08:30")).toEqual({ time: "8:30", period: "am" });
    expect(toClockTime("12:00")).toEqual({ time: "12:00", period: "pm" });
    expect(toClockTime("00:05")).toEqual({ time: "12:05", period: "am" });
  });
});

describe("Nairobi dates", () => {
  it("shows UTC instants in Nairobi time", () => {
    expect(nairobiHm("2026-10-31T11:30:00Z")).toBe("14:30");
  });

  it("finds the next Sabbath", () => {
    expect(nextSabbath(new Date("2026-10-21T09:00:00Z"))).toBe("2026-10-24");
    // Saturday counts as this Sabbath.
    expect(nextSabbath(new Date("2026-10-24T05:00:00Z"))).toBe("2026-10-24");
    // Friday 23:30 UTC is already Saturday in Nairobi.
    expect(nextSabbath(new Date("2026-10-23T23:30:00Z"))).toBe("2026-10-24");
  });

  it("hides expired items", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    expect(isVisible(null, now)).toBe(true);
    expect(isVisible("2026-10-24T20:59:59Z", now)).toBe(false);
    expect(isVisible("2026-10-31T14:30:00Z", now)).toBe(true);
  });
});
