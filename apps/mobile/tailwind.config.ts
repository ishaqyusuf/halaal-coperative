import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./*.{js,jsx,ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        overlay: "var(--overlay)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          foreground: "var(--brand-foreground)",
        },
        "brand-contrast": "var(--brand-contrast)",
        "brand-surface": {
          DEFAULT: "var(--brand-surface)",
          foreground: "var(--brand-surface-foreground)",
        },
        "brand-vivid": "var(--brand-vivid)",
        "brand-warm": "var(--brand-warm)",
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          foreground: "var(--warn-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // T00 02 Brand native additions (source: src/lib/design-tokens.ts).
        "foreground-soft": "var(--foreground-soft)",
        heading: "var(--heading)",
        "surface-raised": "var(--surface-raised)",
        "surface-float": "var(--surface-float)",
        "hero-start": "var(--hero-start)",
        "hero-mid": "var(--hero-mid)",
        "hero-end": "var(--hero-end)",
        "hero-foreground": "var(--hero-foreground)",
        "hero-accent": "var(--hero-accent)",
        "hero-mark-foreground": "var(--hero-mark-foreground)",
        "tint-warm": {
          DEFAULT: "var(--tint-warm)",
          foreground: "var(--tint-warm-foreground)",
        },
        "tint-vivid": {
          DEFAULT: "var(--tint-vivid)",
          foreground: "var(--tint-vivid-foreground)",
        },
        "tint-success": {
          DEFAULT: "var(--tint-success)",
          foreground: "var(--tint-success-foreground)",
        },
        "tint-danger": {
          DEFAULT: "var(--tint-danger)",
          foreground: "var(--tint-danger-foreground)",
        },
        "tint-sky": {
          DEFAULT: "var(--tint-sky)",
          foreground: "var(--tint-sky-foreground)",
        },
        "tint-lilac": {
          DEFAULT: "var(--tint-lilac)",
          foreground: "var(--tint-lilac-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config
