import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, wiki-like palette — deliberately not a dev tool's red/green.
        ink: "#1f2430",
        muted: "#6b7280",
        canvas: "#f7f8fa",
        added: {
          bg: "#eaf6ee",
          accent: "#1f8a4c",
          inline: "#bdebcd",
        },
        removed: {
          bg: "#fbecec",
          accent: "#b4453a",
          inline: "#f3c9c4",
        },
        modified: {
          bg: "#fef6e7",
          accent: "#b9821f",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
