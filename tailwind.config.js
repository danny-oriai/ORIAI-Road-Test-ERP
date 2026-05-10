/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PRD v0.3 design tokens
        bg: "#F8FAFC",
        card: "#FFFFFF",
        primary: { DEFAULT: "#2563EB", soft: "#EFF6FF" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        soft: "0 4px 12px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
};
