import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Low-data principle: no remote images are configured on purpose.
  // Churches use initials avatars; the logo is inline SVG.
  poweredByHeader: false,
  experimental: {
    // Verification letters are up to 5 MB (photos are compressed on the phone first).
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default withNextIntl(nextConfig);
