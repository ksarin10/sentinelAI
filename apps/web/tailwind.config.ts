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
        "2xl": "1.125rem"
      },
      boxShadow: {
        panel: "0 1px 2px hsl(222 39% 11% / 0.04), 0 4px 16px hsl(222 39% 11% / 0.06)",
        lift: "0 8px 30px hsl(222 39% 11% / 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
