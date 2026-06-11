import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "page-enter": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 6px hsl(var(--coral-start) / 0.15)",
            opacity: "0.6",
          },
          "50%": {
            boxShadow: "0 0 14px hsl(var(--coral-start) / 0.35)",
            opacity: "1",
          },
        },
        "ripple": {
          to: { transform: "scale(2.5)", opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-top-2": {
          from: { transform: "translateY(-0.5rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "zoom-in-95": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "zoom-out-95": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out forwards",
        "fade-out": "fade-out 0.15s ease-in forwards",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-down": "slide-down 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "page-enter": "page-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "shimmer": "shimmer 1.8s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "ripple": "ripple 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-in-from-top-2": "slide-in-from-top-2 0.2s ease-out forwards",
        "zoom-in-95": "zoom-in-95 0.2s ease-out forwards",
        "zoom-out-95": "zoom-out-95 0.15s ease-in forwards",
      },
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
