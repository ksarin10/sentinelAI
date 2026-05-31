import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        card: "hsl(var(--card))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        sidebar: "hsl(var(--sidebar))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        ring: "hsl(var(--ring))"
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.375rem"
      },
      boxShadow: {
        panel: "0 1px 2px hsl(222 42% 9% / 0.04), 0 8px 24px hsl(222 42% 9% / 0.06)",
        lift: "0 12px 40px hsl(222 42% 9% / 0.1), 0 2px 8px hsl(222 42% 9% / 0.04)",
        glow: "0 0 0 1px hsl(168 50% 40% / 0.15), 0 8px 32px hsl(168 50% 40% / 0.12)"
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, hsl(168 65% 38%) 0%, hsl(168 55% 28%) 100%)",
        "accent-gradient": "linear-gradient(135deg, hsl(14 88% 58%) 0%, hsl(14 75% 48%) 100%)"
      }
    }
  },
  plugins: []
};

export default config;
