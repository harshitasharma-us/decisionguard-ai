/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          cream: '#FFF9F0',
          sidebar: '#FFFCF7',
          card: '#FFFFFF',
          peach: '#F5D6B8',
          'peach-light': '#FDF4EC',
          'peach-hover': '#F0C7A1',
          lavender: '#DCC8F4',
          'lavender-light': '#F5F0FC',
          'lavender-hover': '#CDB2F0',
          pink: '#F1C5D0',
          'pink-light': '#FDF2F5',
          'pink-hover': '#EAB5C2',
          blue: '#C9DCF5',
          'blue-light': '#F0F6FD',
          'blue-hover': '#B4CEF0',
          mint: '#D1F2D9',
          'mint-light': '#F2FAF4',
          charcoal: '#342E35',
          taupe: '#827783',
          border: '#EADFD4',
          'border-subtle': '#F3ECE4',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px 0 rgba(52, 46, 53, 0.04)',
        'soft-md': '0 4px 16px -2px rgba(52, 46, 53, 0.06), 0 2px 6px -1px rgba(52, 46, 53, 0.03)',
        'soft-lg': '0 10px 25px -4px rgba(52, 46, 53, 0.08), 0 4px 10px -2px rgba(52, 46, 53, 0.04)',
        'composer': '0 4px 20px -2px rgba(52, 46, 53, 0.07), 0 0 0 1px #EADFD4',
        'pastel-peach': '0 4px 14px 0 rgba(245, 214, 184, 0.45)',
        'pastel-lavender': '0 4px 14px 0 rgba(220, 200, 244, 0.45)',
      },
      borderRadius: {
        'card': '18px',
        'panel': '22px',
        'bubble': '18px',
      }
    },
  },
  plugins: [],
}
