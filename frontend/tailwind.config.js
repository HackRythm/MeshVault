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
        canvas: {
          DEFAULT: '#09090b',
          subtle: '#0c0c0e',
          panel: '#121215',
          elevated: '#18181c',
          active: '#202024',
        },
        border: {
          subtle: '#18181b',
          DEFAULT: '#27272a',
          strong: '#3f3f46',
        },
        accent: {
          DEFAULT: '#2563eb', // crisp blue
          hover: '#1d4ed8',
          subtle: 'rgba(37, 99, 235, 0.12)',
          border: 'rgba(37, 99, 235, 0.35)',
          foreground: '#60a5fa',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'micro': ['11px', { lineHeight: '14px', letterSpacing: '0.05em' }],
        'xxs': ['10px', { lineHeight: '13px', letterSpacing: '0.04em' }],
      }
    },
  },
  plugins: [],
}
