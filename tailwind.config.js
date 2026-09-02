/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        paper: "#FAFAF7",
        surface: "#1C1C1C",
        rule: "#3A3A3A",
        mute: "#8F8F8F",
      },
      fontFamily: {
        display: ['"Archivo Black"', "sans-serif"],
        mono: ['"Space Mono"', "monospace"],
      },
      borderRadius: {
        none: "0px",
      }
    },
  },
  plugins: [],
}
