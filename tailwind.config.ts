import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          50: "#f8faf9",
          100: "#eef3f1",
          200: "#dce8e4",
          300: "#bdd3cb",
          400: "#98b5aa",
          500: "#76998c",
          600: "#5c7d72",
          700: "#4c665d",
          800: "#41534d",
          900: "#394642",
          950: "#1f2825",
        },
        accent: {
          DEFAULT: "#0d9488",
          light: "#2dd4bf",
          dark: "#0f766e",
        },
        status: {
          ok: "#059669",
          warn: "#d97706",
          error: "#dc2626",
          muted: "#64748b",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
