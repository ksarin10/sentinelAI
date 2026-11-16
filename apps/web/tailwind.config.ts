import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
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
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        xl: "0.625rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      boxShadow: {
        panel:
          "0 1px 0 hsl(0 0% 100% / 0.025), 0 16px 40px hsl(225 40% 2% / 0.16)",
        lift: "0 1px 0 hsl(0 0% 100% / 0.04), 0 24px 64px hsl(225 50% 2% / 0.32)",
        glow: "0 0 0 1px hsl(81 88% 64% / 0.18), 0 0 28px hsl(81 88% 64% / 0.08)",
      },
      backgroundImage: {
        "primary-gradient":
          "linear-gradient(135deg, hsl(81 88% 66%) 0%, hsl(72 86% 57%) 100%)",
        "accent-gradient":
          "linear-gradient(135deg, hsl(190 92% 60%) 0%, hsl(215 88% 62%) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
