import path from "path"
import { fileURLToPath } from "url"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server build for the Docker runner stage (CLAUDE.md §8)
  output: "standalone",
  // Pin tracing to this repo — a stray lockfile in the user home directory
  // otherwise makes Next infer the wrong workspace root
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
