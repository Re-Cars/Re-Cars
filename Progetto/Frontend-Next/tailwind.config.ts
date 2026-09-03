import type { Config } from "tailwindcss";

/**
 * Palette RE|CARS ricavata da Progetto/Frontend/style-base.css.
 * I colori "dinamici" (che cambiano tra dark e light) puntano alle CSS
 * variables definite in globals.css; quelli fissi sono hardcoded come
 * nel sito originale (#f97316 = arancione brand).
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "card-bg": "var(--card-bg)",
        "header-bg": "var(--header-bg)",
        "sidebar-bg": "var(--sidebar-bg)",
        "dropdown-bg": "var(--dropdown-bg)",
        "input-bg": "var(--input-bg)",
        "text-main": "var(--text)",
        "text-muted": "var(--text-muted)",
        muted: "var(--muted)",
        success: "var(--success)",
        error: "var(--error)",
        "accent-orange": "#f97316",
        "accent-orange-dark": "#ea580c",
        "accent-orange-deeper": "#c2410c",
        "accent-orange-soft": "#fb923c",
      },
      borderColor: {
        DEFAULT: "var(--border-subtle)",
        accent: "var(--border)",
        table: "var(--border-table)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      fontSize: {
        "app-xs": "0.72rem",
        "app-sm": "0.8rem",
        "app-base": "0.95rem",
        "app-md": "1rem",
        "app-lg": "1.1rem",
        "app-xl": "1.4rem",
      },
    },
  },
};

export default config;
