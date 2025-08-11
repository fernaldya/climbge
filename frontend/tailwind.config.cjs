/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F7A62D',
          dark: '#D88F23',
          light: '#F9B94F',
        },
      },
    },
  },
  plugins: [],
}
