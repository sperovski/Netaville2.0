import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // The repo also holds the mobile app's lockfile; point Turbopack at this app
  // so it stops guessing the workspace root.
  turbopack: {root: __dirname},
};

export default nextConfig;
