/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a", // slate-900
        primary: "#10b981",    // emerald-500
        warning: "#f59e0b",    // amber-500
        surface: "#1e293b",    // slate-800
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
