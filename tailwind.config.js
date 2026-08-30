/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffdf0',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          metallic: '#D4AF37',
        },
        crypto: {
          btc: '#F7931A',
          eth: '#627EEA',
          bnb: '#F3BA2F',
          ada: '#0033AD',
          dot: '#E6007A',
          trx: '#EF0027',
          xrp: '#23292F',
          doge: '#C2A633',
          pol: '#8247E5',
          sol: '#14F195',
        },
        dark: {
          bg: '#0B0F17',
          card: '#131B2A',
          cardHover: '#1B263B',
          border: '#1F2E45',
          surface: '#0F172A',
        },
        light: {
          bg: '#F1F5F9',
          card: '#FFFFFF',
          cardWell: '#F8FAFC',
          border: '#E2E8F0',
          surface: '#F8FAFC',
        }
      },
      fontFamily: {
        vazir: ['Vazirmatn', 'sans-serif'],
      },
      keyframes: {
        toastSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(1rem) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'toast-slide-up': 'toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
