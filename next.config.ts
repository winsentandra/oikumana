import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shell fills the viewport edge to edge; the floating dev badge sits on
  // top of the map and gets in the way of visual comparison against the
  // mockups.
  devIndicators: false,
};

export default nextConfig;
