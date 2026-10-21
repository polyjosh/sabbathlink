/**
 * Kenyan mobile numbers. Accepts what people actually type ("0712 345 678",
 * "712345678", "+254 712 345 678", "254712345678") and returns E.164.
 * Safaricom, Airtel and Telkom numbers start with 7 or 1 after the country code.
 */
export function normalizeKenyanPhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith("254")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  if (!/^[17]\d{8}$/.test(digits)) return null;
  return `+254${digits}`;
}

/** "+254712345678" -> "+254 712 345 678" */
export function formatKenyanPhone(e164: string): string {
  const local = e164.replace(/^\+254/, "");
  return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** Masks the middle digits for invite lists: "+254 733 *** 412". */
export function maskKenyanPhone(e164: string): string {
  const local = e164.replace(/^\+254/, "");
  return `+254 ${local.slice(0, 3)} *** ${local.slice(6)}`;
}
