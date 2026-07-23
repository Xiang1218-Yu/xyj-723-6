/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'carbon': {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#b3b3b3',
          300: '#808080',
          400: '#4d4d4d',
          500: '#333333',
          600: '#262626',
          700: '#1A1A1A',
          800: '#141414',
          900: '#0D0D0D',
        },
        'coral': {
          50: '#FFF5F2',
          100: '#FFE6DF',
          200: '#FFC5B8',
          300: '#FFA38F',
          400: '#FF876C',
          500: '#FF6B4A',
          600: '#FF5733',
          700: '#E64A2E',
          800: '#CC3F28',
          900: '#B33523',
        },
        'lavender': {
          50: '#F8F5FC',
          100: '#EDE7F6',
          200: '#D1C4E9',
          300: '#B8A0D4',
          400: '#9C7CC2',
          500: '#7E57C2',
          600: '#6A4AA8',
          700: '#563D87',
          800: '#422E66',
          900: '#2E1F45',
        }
      },
      fontFamily: {
        'display': ['"Cormorant Garamond"', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 107, 74, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 107, 74, 0.8)' },
        }
      }
    },
  },
  plugins: [],
};
