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
        background: "#F4F1FA",
        foreground: "#2B2350",
        heading: "#2B2350",
        brand: {
          purple: "#6B2D8F",
          blue: "#4A66B0",
          light: "#F4F1FA",
          soft: "#E9E4F5",
          50: "#F8F5FC",
          100: "#EFE9F8",
          200: "#DDD0F0",
          300: "#C3ADE3",
          400: "#A182D2",
          500: "#6B2D8F",
          600: "#5A237A",
          700: "#471A62",
          800: "#36134B",
          900: "#280C39",
          teal: "#4A66B0",
        },
        slate: {
          subtle: "#F4F1FA",
          muted: "#645D7E",
          dark: "#2B2350",
          heading: "#2B2350",
        },
        emerald: {
          50: "#F8F5FC",
          100: "#EFE9F8",
          200: "#DDD0F0",
          500: "#6B2D8F",
          600: "#5A237A",
          700: "#471A62",
          800: "#36134B",
        },
        teal: {
          50: "#EFF3FC",
          100: "#DEE7FA",
          500: "#4A66B0",
          600: "#3E5799",
          700: "#32467C",
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
