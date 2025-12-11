import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 1. React Compiler (Experimental Feature)
  
    reactCompiler: true,

  // 2. Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevents your site from being embedded in an iframe (Clickjacking protection)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevents browser from guessing content types
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Protects user privacy
          },
          {
            key: 'Permissions-Policy',
            value: "camera=(), microphone=(), geolocation=()", // Disables hardware access
          },
        ],
      },
    ];
  },
};

export default nextConfig;