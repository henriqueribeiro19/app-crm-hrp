/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#00c9a7',
        surface: {
          DEFAULT: '#161b27',
          card:    '#1e2433',
          sidebar: '#0f1117',
          hover:   '#232b3d',
        },
        cloudfy: { light: 'rgba(139,92,246,0.2)', DEFAULT: '#a78bfa' },
        cplung:  { light: 'rgba(20,184,166,0.2)', DEFAULT: '#2dd4bf' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderColor: { DEFAULT: 'rgba(255,255,255,0.08)' },
    },
  },
  plugins: [],
}
