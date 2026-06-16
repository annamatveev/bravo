import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme tokens — resolved from CSS variables that flip in dark mode.
        canvas: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        line: "var(--line)",
        hover: "var(--hover)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        // Brand identity — a violet→cyan signature, distinct from the
        // semantic palette (emerald/amber/rose/indigo) used for status.
        brand: {
          DEFAULT: "var(--brand)",
          2: "var(--brand-2)",
          soft: "var(--brand-soft)",
          ink: "var(--brand-ink)",
        },
        // Semantic accents (work on both themes).
        added: { accent: "#1f9d57", inline: "var(--added-inline)" },
        removed: { accent: "#d2483b", inline: "var(--removed-inline)" },
        modified: { accent: "#c98a1e" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,18,28,0.04), 0 1px 3px rgba(16,18,28,0.06)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
