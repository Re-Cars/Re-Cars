/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        orange: "#f97316",
        bg: "#010130",
        surface: "#141445",
        muted: "#a0a8b8",
        success: "#37a961",
        error: "#e53935",
        blue: "#3b82f6",
        yellow: "#fbbf24",
      },
    },
  },
  plugins: [],
};