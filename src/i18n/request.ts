import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

// The language is a per-device choice (cookie), not part of the URL, so links
// shared on WhatsApp open in each reader's own language.
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  return {
    locale,
    timeZone: "Africa/Nairobi",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
