/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dg: {
          bg: '#09091F',
          secondary: '#11102D',
          panel: '#161438',
          'panel-light': '#1C1947',
          'panel-border': 'rgba(124, 92, 255, 0.18)',
          'panel-border-bright': 'rgba(53, 214, 255, 0.35)',
          violet: '#7C5CFF',
          cyan: '#35D6FF',
          lavender: '#B58CFF',
          success: '#39E58C',
          warning: '#FFB84D',
          danger: '#FF5577',
          text: '#F8F7FF',
          muted: '#AAA7C4',
          dim: '#6D6A8F',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        space: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-violet': '0 0 25px -5px rgba(124, 92, 255, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(53, 214, 255, 0.35)',
        'glow-success': '0 0 25px -5px rgba(57, 229, 140, 0.3)',
        'glow-danger': '0 0 25px -5px rgba(255, 85, 119, 0.3)',
        'panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      borderRadius: {
        'panel': '14px',
        'hero': '18px',
      }
    },
  },
  plugins: [],
}
