import type messages from "../messages/en.json";
import type { Locale } from "./lib/types";

// Type-checks every translation key against the English messages.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
