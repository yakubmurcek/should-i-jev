/** @type {import('next').NextConfig} */
const nextConfig = {
  // The share cards read their font from disk; make sure it ships with them.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/**"],
    "/twitter-image": ["./assets/fonts/**"],
    "/v/[hash]/opengraph-image": ["./assets/fonts/**"],
    "/v/[hash]/twitter-image": ["./assets/fonts/**"],
  },
  // Nothing here is meant to be framed, sniffed or leak its URL off-site.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
