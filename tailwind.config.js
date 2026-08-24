/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070A10",
        panel: "#0B1020",
        neon: "#62F6FF",
        neon2: "#B7FF6A",
        danger: "#FF5C7A",
        muted: "#8EA3B0",
      },
      boxShadow: {
        glow: "0 0 40px rgba(98,246,255,0.12)",
      }
    },
  },
  plugins: [],
}
