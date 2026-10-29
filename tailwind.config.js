/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Bảng màu "thủy mặc": mực đen, ngọc bích, vàng kim, chu sa
        ink: { 950: '#07090f', 900: '#0b0f1a', 800: '#121826', 700: '#1b2335', 600: '#27324a' },
        jade: { 300: '#8ff0c8', 400: '#4fdca6', 500: '#22c08a', 600: '#169a6e' },
        gold: { 300: '#ffe29a', 400: '#f6c85f', 500: '#d9a53a' },
        cinnabar: { 400: '#ff7b6b', 500: '#e5493a' },
      },
      fontFamily: {
        serif: ['"Noto Serif"', '"Songti SC"', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
