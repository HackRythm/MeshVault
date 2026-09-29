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
          DEFAULT: '#000000',
          pure: '#000000',
          secondary: '#050505',
          surface: '#0A0A0C',
          card: '#0D0D10',
          hover: '#121216',
          active: '#17171C',
          input: '#08080A',
        },
        hairline: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.05)',
          strong: 'rgba(255, 255, 255, 0.15)',
          blue: 'rgba(59, 130, 246, 0.35)',
        },
        brand: {
          primary: '#2563EB',      // Formal, confident primary signal blue
          'primary-hover': '#1D4ED8',
          'primary-light': '#3B82F6',
          secondary: '#38BDF8',    // Cooler, lighter blue / cyan for data readouts & telemetry
          'secondary-hover': '#60A5FA',
          subtle: 'rgba(37, 99, 235, 0.12)',
          border: 'rgba(37, 99, 235, 0.35)',
        },
        // Muted semantic status colors (for state badges ONLY, never as general UI accents)
        status: {
          success: '#4ADE80',
          'success-bg': 'rgba(74, 222, 128, 0.08)',
          'success-border': 'rgba(74, 222, 128, 0.25)',
          warning: '#FBBF24',
          'warning-bg': 'rgba(251, 191, 36, 0.08)',
          'warning-border': 'rgba(251, 191, 36, 0.25)',
          error: '#F87171',
          'error-bg': 'rgba(248, 113, 113, 0.08)',
          'error-border': 'rgba(248, 113, 113, 0.25)',
          info: '#38BDF8',
          'info-bg': 'rgba(56, 189, 248, 0.08)',
          'info-border': 'rgba(56, 189, 248, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'eyebrow': ['11px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        'micro': ['10px', { lineHeight: '13px', letterSpacing: '0.05em' }],
      },
      transitionTimingFunction: {
        'sharp': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
