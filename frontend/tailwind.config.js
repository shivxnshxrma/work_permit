/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vms: {
          deep: '#6e1b74',
          primary: '#7b2f81',
          active: '#86418c',
          accent: '#905195',
          mid: '#9a609f',
          soft: '#a385b6',
          light: '#ac7cb0',
          shell: '#f8f3f9',
          panel: '#fffafd',
          tint: '#f4e9f5',
          border: '#eaddec',
          text: '#2a1430',
          body: '#4e3453',
          muted: '#85638a',
          50: '#f8f3f9',
          100: '#f4e9f5',
          200: '#eaddec',
          300: '#ac7cb0',
          400: '#a385b6',
          500: '#9a609f',
          600: '#905195',
          700: '#86418c',
          800: '#7b2f81',
          900: '#6e1b74',
        },
      },
    },
  },
  plugins: [],
};
