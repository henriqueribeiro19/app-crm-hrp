/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        cloudfy: {
          light: '#EEEDFE',
          DEFAULT: '#534AB7',
          dark: '#3C3489',
        },
        cplung: {
          light: '#E1F5EE',
          DEFAULT: '#1D9E75',
          dark: '#085041',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
