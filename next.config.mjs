/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // Keep in step with WIDTHS in tools/images/build.py.
    deviceSizes: [640, 828, 1080, 1440, 1920],
    imageSizes: [96, 256, 384]
  }
};

export default nextConfig;
