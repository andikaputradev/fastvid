import type { Config } from "tailwindcss";

const brand = {
  50: "#eef2ff",
  100: "#e0e8ff",
  200: "#c4d2ff",
  300: "#9cb2ff",
  400: "#6f89ff",
  500: "#4565ff",
  600: "#2447f2",
  700: "#1b38cf",
  800: "#1c32a5",
  900: "#1c3081",
  950: "#141e4f"
};

const ink = {
  50: "#f7f8fa",
  100: "#eff1f5",
  200: "#e1e5ec",
  300: "#c9cfda",
  400: "#8791a4",
  500: "#6b7587",
  600: "#4c5566",
  700: "#373f4e",
  800: "#232a37",
  850: "#1a202b",
  900: "#131822",
  950: "#0b0f17"
};

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        brand,
        teal: brand,
        slate: ink
      },
      fontFamily: {
        sans: [
          '"Instrument Sans"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif"
        ]
      },
      spacing: { 13: "3.25rem" },
      borderRadius: { lg: "0.5rem", xl: "0.625rem", "2xl": "0.875rem" },
      boxShadow: {
        xs: "0 1px 2px rgb(11 15 23 / 0.06)",
        sm: "0 1px 3px rgb(11 15 23 / 0.08), 0 1px 2px rgb(11 15 23 / 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
