import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kofkan: {
          black: "#000000",
          white: "#ffffff",
          charcoal: "#333333",
          muted: "#a09696",
          pearl: "#f8f8f8",
          "bg-secondary": "#f8f8f8",
          border: "#e0e0e0"
        }
      },
      boxShadow: {
        soft: "0 2px 20px rgba(0, 0, 0, 0.1)"
      }
    }
  },
  plugins: []
};

export default config;
