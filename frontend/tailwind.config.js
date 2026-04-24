/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#e8eef8', 100: '#c5d4ed', 200: '#9eb7e0',
          300: '#7799d3', 400: '#5a83ca', 500: '#3d6ec1',
          600: '#2f5aab', 700: '#1e3a5f', 800: '#162d4a',
          900: '#0e1f33',
        },
      },
    },
  },
  plugins: [],
};
