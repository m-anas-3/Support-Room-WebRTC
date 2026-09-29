import type { NextConfig } from "next";

const browserSecurityHeaders = [
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=(self)",
      "display-capture=(self)",
      "speaker-selection=(self)",
      "fullscreen=(self)",
      "autoplay=(self)",
      "screen-wake-lock=(self)",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "serial=()",
      "bluetooth=()",
    ].join(", "),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
];

const nextConfig: NextConfig = {
  distDir: process.env.SUPPORTROOM_E2E === "1" ? ".next-e2e" : ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: browserSecurityHeaders }];
  },
};

export default nextConfig;
