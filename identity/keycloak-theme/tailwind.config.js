/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        utm: {
          primary: "#64748B",
          primaryHover: "#475569",
          primaryActive: "#334155"
        }
      }
    },
  },
  plugins: [],
}
