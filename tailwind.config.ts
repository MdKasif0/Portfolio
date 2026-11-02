import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05050A",
          900: "#0A0A12",
          850: "#0E0E18",
          800: "#13131F"
        },
        text: {
          100: "#F7F7F8",
          300: "#C9C9D2",
          500: "#8C8C9A"
        },
        red: {
          400: "#F2503E",
          500: "#E5322D",
          600: "#B3201C"
        },
        surface: "#0A0A12",
        accent: "#E5322D",
        coral: "#F2503E",
        muted: "#8C8C9A",
        wine: {
          DEFAULT: "#2A0A12",
          deep: "#2A0A12",
          light: "#4A0F1C"
        },
        "build-blue": "#3B82F6"
      },
      maxWidth: { shell: "1440px" },
      spacing: { gutter: "var(--gutter)", section: "var(--section-space)" }
    }
  },
  plugins: []
};

export default config;
