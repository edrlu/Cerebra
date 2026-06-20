import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets run.sh safely launch another local instance when the default address
  // is already in use. Normal `npm run dev` behavior remains unchanged.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
