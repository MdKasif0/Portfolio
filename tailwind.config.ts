import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink-950)",
          950: "var(--ink-950)",
          900: "var(--ink-900)",
          850: "var(--ink-850)",
          800: "var(--ink-800)"
        },
        surface: { DEFAULT: "var(--ink-900)", elevated: "var(--ink-850)" },
        line: { soft: "var(--line-soft)", strong: "var(--line-strong)" },
        text: { 100: "var(--text-100)", 300: "var(--text-300)", 500: "var(--text-500)" },
        red: { 400: "var(--red-400)", 500: "var(--red-500)", 600: "var(--red-600)" },
        wine: { start: "#2A0A12", end: "#4A0F1C" },
        accent: "var(--red-500)",
        coral: "var(--red-400)",
        muted: "var(--text-500)",
        electric: { blue: "var(--electric-blue)" }
      },
      maxWidth: { shell: "1440px" },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        script: ["var(--font-script)", "cursive"]
      },
      spacing: {
        page: "var(--container-gutter)",
        section: "var(--section-space)"
      }
    }
  },
  plugins: []
};

export default config;
