/** @type {import('next').NextConfig} */
const nextConfig = {
  // The share cards read their font from disk; make sure it ships with them.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/**"],
    "/twitter-image": ["./assets/fonts/**"],
    "/v/[hash]/opengraph-image": ["./assets/fonts/**"],
    "/v/[hash]/twitter-image": ["./assets/fonts/**"],
  },
};
export default nextConfig;
