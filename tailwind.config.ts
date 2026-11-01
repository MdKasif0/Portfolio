import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#05050A",
        surface: "#0B0B12",
        accent: "#E5322D",
        coral: "#F2503E",
        muted: "#9A9AA5"
      },
      maxWidth: { shell: "1280px" }
    }
  },
  plugins: []
};

export default config;
