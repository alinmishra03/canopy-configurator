/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f7f7f6',
          100: '#efeeec',
          200: '#e2e0dc',
          300: '#cbc8c2',
          400: '#a29e96',
          500: '#7a766e',
          600: '#5c5953',
          700: '#45433f',
          800: '#2d2c29',
          900: '#1b1a18',
        },
        accent: {
          50: '#eef4ff',
          100: '#dbe6ff',
          500: '#2f5bea',
          600: '#2449c8',
          700: '#1d3aa0',
        },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(27,26,24,0.04), 0 4px 16px rgba(27,26,24,0.05)',
        lift: '0 2px 4px rgba(27,26,24,0.06), 0 12px 32px rgba(27,26,24,0.10)',
      },
    },
  },
  plugins: [],
};
