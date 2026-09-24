/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          primary: '#f26522',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#d97706',
          700: '#b45309',
          accent: '#e5b82e',
        },
        emerald: {
          brand: '#064e3b',
          light: '#059669',
        },
        magenta: {
          brand: '#9f1239',
          light: '#e11d48',
        },
        whatsapp: {
          teal: '#075e54',
          light: '#25d366',
          dark: '#128c7e',
          chatbg: '#efeae2',
          bubbleOut: '#d9fdd3',
          bubbleIn: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}
