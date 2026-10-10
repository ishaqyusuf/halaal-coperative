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
