import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Azure App Service への自己完結デプロイ用。
  // .next/standalone/ に server.js + 必要な node_modules がトレースされて入る。
  // node_modules を artifact として持ち回らないので symlink 破損の心配が無い。
  output: "standalone",
};

export default nextConfig;
