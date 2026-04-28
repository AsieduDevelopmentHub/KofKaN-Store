import type { Config } from "tailwindcss";

/**
 * KofKaN Store — soft monochrome palette.
 *
 * The codebase was forked from Sikapa, which uses semantic tokens like
 * `kofkan-cream`, `kofkan-gold`, `kofkan-crimson`, `kofkan-text-primary`, etc.
 * We keep the SAME class names so we don't have to touch every component,
 * but remap the values to a near-black / near-white palette with subtle
 * saturation so it reads as premium grayscale (not pure #000/#fff).
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kofkan: {
          // === Soft monochrome accents (blue-gray tinted, not pure B/W) ===
          // Keep token names stable (`cyan`, `gold`, `accent`, etc.) to avoid large refactors.
          cyan: "#AEB7C2",
          "cyan-dark": "#8E98A6",
          "cyan-hover": "#9FA8B4",
          "cyan-soft": "#EFF2F6",

          // === Surfaces ===
          deep: "#101318",
          "bg-deep": "#101318",
          surface: "#171C22",
          silver: "#E9EDF2",
          cream: "#F5F6F8",
          "bg-secondary": "#F5F6F8",
          white: "#F8F9FB",
          black: "#0E1116",

          // === Borders / dividers ===
          border: "#E2E6EC",
          "border-dark": "#2A3038",
          "gray-soft": "#E2E6EC",

          // === Text scale ===
          "text-primary": "#12161D",
          "text-secondary": "#3E4652",
          "text-muted": "#8A95A5",
          muted: "#8A95A5",
          charcoal: "#3E4652",
          "hero-subtext": "#E8EBF0",

          // === CTA aliases (monochrome) ===
          gold: "#AEB7C2",
          "gold-hover": "#9FA8B4",

          // === Alert / sale aliases (still grayscale) ===
          crimson: "#5E6773",
          "crimson-dark": "#454D57",

          // === Secondary accent (same family, slightly darker) ===
          accent: "#B8C0CC",
          "accent-hover": "#A8B0BC",
        },
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-roboto-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: ["2rem", { lineHeight: "1.15" }],
        "hero-lg": ["2.25rem", { lineHeight: "1.12" }],
        "page-title": ["1.375rem", { lineHeight: "1.3" }],
        "section-title": ["1.25rem", { lineHeight: "1.35" }],
        body: ["1rem", { lineHeight: "1.5" }],
        small: ["0.875rem", { lineHeight: "1.45" }],
      },
      maxWidth: {
        mobile: "430px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(30, 41, 59, 0.10)",
        glow: "0 0 20px rgba(174, 183, 194, 0.35)",
      },
      keyframes: {
        "splash-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "cyan-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(174, 183, 194, 0.25))" },
          "50%": { filter: "drop-shadow(0 0 18px rgba(174, 183, 194, 0.45))" },
        },
        "gold-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(174, 183, 194, 0.25))" },
          "50%": { filter: "drop-shadow(0 0 18px rgba(174, 183, 194, 0.45))" },
        },
        "hero-model": {
          "0%": { opacity: "0", transform: "translateX(28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "hero-text": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "hero-product": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "splash-logo-enter": {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(16px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "splash-dissolve-out": {
          "0%": { opacity: "1", filter: "blur(0px)", transform: "scale(1)" },
          "100%": { opacity: "0", filter: "blur(14px)", transform: "scale(1.035)" },
        },
        "splash-logo-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 6px rgba(174, 183, 194, 0.30))" },
          "50%": { filter: "drop-shadow(0 0 18px rgba(174, 183, 194, 0.55))" },
        },
      },
      animation: {
        "splash-in": "splash-in 0.9s ease-out forwards",
        "splash-logo-enter": "splash-logo-enter 1.75s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "splash-dissolve-out": "splash-dissolve-out 1.15s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "splash-logo-glow": "splash-logo-glow 2.2s ease-in-out infinite",
        "cyan-glow": "cyan-glow 2s ease-in-out infinite",
        "gold-glow": "gold-glow 2s ease-in-out infinite",
        "hero-model": "hero-model 1s ease-out 0.2s forwards",
        "hero-text": "hero-text 0.85s ease-out 0.35s forwards",
        "hero-product": "hero-product 0.7s ease-out 0.55s forwards",
        "hero-fade": "splash-in 1s ease-out forwards",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
