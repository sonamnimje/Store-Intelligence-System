/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1220',
        panel: '#111a2e',
        accent: '#38bdf8',
        mint: '#34d399',
        warning: '#fbbf24',
        danger: '#fb7185',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56,189,248,0.18), 0 24px 60px rgba(2,8,23,0.55)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};