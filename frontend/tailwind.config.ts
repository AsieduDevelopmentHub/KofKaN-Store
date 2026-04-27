import type { Config } from "tailwindcss";

/**
 * KofKaN Store — electronics palette.
 *
 * The codebase was forked from Sikapa, which uses semantic tokens like
 * `kofkan-cream`, `kofkan-gold`, `kofkan-crimson`, `kofkan-text-primary`, etc.
 * We keep the SAME class names so we don't have to touch every component,
 * but remap the values to a tech / electronics-friendly palette:
 *
 *   - "gold"    → electric cyan  (primary CTA accent)
 *   - "crimson" → vivid red      (sale / alert badges)
 *   - "cream"   → cool off-white (light surface)
 *   - "bg-deep" → deep navy/black (hero, footer, dark dashboards)
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
          // === Primary electronics accents ===
          cyan: "#00B8D9",
          "cyan-dark": "#0099B8",
          "cyan-hover": "#0099B8",
          "cyan-soft": "#E6F7FA",

          // === Surfaces ===
          deep: "#0B0E14",
          "bg-deep": "#0B0E14",
          surface: "#161B22",
          silver: "#E6EDF3",
          cream: "#F4F6F8",
          "bg-secondary": "#F4F6F8",
          white: "#FFFFFF",
          black: "#0B0E14",

          // === Borders / dividers ===
          border: "#E2E8F0",
          "border-dark": "#30363D",
          "gray-soft": "#E2E8F0",

          // === Text scale ===
          "text-primary": "#0F172A",
          "text-secondary": "#475569",
          "text-muted": "#94A3B8",
          muted: "#94A3B8",
          charcoal: "#475569",
          "hero-subtext": "#E6F7FA",

          // === CTA aliases (Sikapa "gold" → electronics cyan) ===
          gold: "#00B8D9",
          "gold-hover": "#0099B8",

          // === Alert / sale aliases (Sikapa "crimson" → vivid red) ===
          crimson: "#DC2626",
          "crimson-dark": "#B91C1C",

          // === Secondary accent (purple) ===
          accent: "#7D52FF",
          "accent-hover": "#653DD6",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
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
        soft: "0 4px 20px rgba(0, 184, 217, 0.12)",
        glow: "0 0 20px rgba(0, 184, 217, 0.45)",
      },
      keyframes: {
        "splash-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "cyan-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(0, 184, 217, 0.35))" },
          "50%": { filter: "drop-shadow(0 0 20px rgba(0, 184, 217, 0.65))" },
        },
        "gold-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px rgba(0, 184, 217, 0.35))" },
          "50%": { filter: "drop-shadow(0 0 20px rgba(0, 184, 217, 0.65))" },
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
          "0%, 100%": { filter: "drop-shadow(0 0 6px rgba(0, 184, 217, 0.4))" },
          "50%": { filter: "drop-shadow(0 0 22px rgba(0, 184, 217, 0.85))" },
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
