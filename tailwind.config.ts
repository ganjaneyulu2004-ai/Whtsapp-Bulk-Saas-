import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-mode="light"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        foreground: "#00153D",
        heading: "#00153D",
        brand: {
          navy: "#00153D",
          blue: "#0066FD",
          purple: "#0066FD",
          light: "#F8FAFC",
          soft: "#E2EAFC",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#0066FD",
          600: "#0057D9",
          700: "#0047B3",
          800: "#00378C",
          900: "#00153D",
          teal: "#0066FD",
        },
        slate: {
          subtle: "#F8FAFC",
          muted: "#4B5563",
          dark: "#00153D",
          heading: "#00153D",
        },
      },
      fontFamily: {
        heading: ["Inter", "Noto Sans Telugu", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        body: ["Inter", "Noto Sans Telugu", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        sans: ["Inter", "Noto Sans Telugu", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        telugu: ["Noto Sans Telugu", "sans-serif"],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(107, 45, 143, 0.08)',
        'card': '0 10px 25px -5px rgba(107, 45, 143, 0.06), 0 8px 10px -6px rgba(43, 35, 80, 0.04)',
        'card-hover': '0 20px 30px -10px rgba(107, 45, 143, 0.14), 0 10px 15px -5px rgba(43, 35, 80, 0.05)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
