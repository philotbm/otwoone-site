import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.studioflow.ie" }],
        destination: "https://studioflow.ie/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
