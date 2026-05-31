/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ブランドカラー（落ち着いた信頼感のある青緑系）
        brand: {
          50: "#eef7f6",
          100: "#d6ecea",
          500: "#0f8b8d",
          600: "#0c7274",
          700: "#0a5c5e",
        },
      },
    },
  },
  plugins: [],
};
