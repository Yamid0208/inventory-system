/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff1ee',
          100: '#ffe4de',
          200: '#ffccc2',
          300: '#ffa797',
          400: '#ff7762',
          500: '#ff5b46', // Coral vibrante / referencia imagen
          600: '#f0432d',
          700: '#c93421',
          800: '#a62d1f',
          900: '#892b1e',
          950: '#4b1109',
          brand: '#ff5b46',
        },
        coral: {
          light: '#fff0ed',
          DEFAULT: '#ff5b46',
          dark: '#e0422e',
        },
        accent: {
          blue: '#2b73ff',
          cyan: '#2ec4b6',
          yellow: '#ffb703',
          purple: '#8b5cf6',
        }
      },
      boxShadow: {
        'card': '0 4px 20px -4px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        'coral-glow': '0 8px 20px -4px rgba(255, 91, 70, 0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}

