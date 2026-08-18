import type { NextConfig } from "next";

const repositoryName = "oikumana"; // Replace if your GitHub repo has another name

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;