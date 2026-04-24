/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#137fec",
        "primary-strong": "#2783e3",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        app: {
          bg: "rgb(var(--color-app-bg) / <alpha-value>)",
          "bg-alt": "rgb(var(--color-app-bg-alt) / <alpha-value>)",
          panel: "rgb(var(--color-app-panel) / <alpha-value>)",
          "panel-soft": "rgb(var(--color-app-panel-soft) / <alpha-value>)",
          border: "rgb(var(--color-app-border) / <alpha-value>)",
          text: "rgb(var(--color-app-text) / <alpha-value>)",
          "text-muted": "rgb(var(--color-app-text-muted) / <alpha-value>)",
          "text-subtle": "rgb(var(--color-app-text-subtle) / <alpha-value>)",
          success: "rgb(var(--color-app-success) / <alpha-value>)",
          warning: "rgb(var(--color-app-warning) / <alpha-value>)",
          danger: "rgb(var(--color-app-danger) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "app-card":
          "0 18px 48px rgba(5, 11, 24, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      },
    },
  },
  plugins: [],
};
