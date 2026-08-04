/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas:    '#0F172A',
        surface:   '#1E293B',
        border:    '#334155',
        accent:    '#3B82F6',
        'accent-hover': '#2563EB',
        'accent-soft': '#3B82F620',
        success:   '#10B981',
        'success-soft': '#10B98120',
        alert:     '#EF4444',
        'alert-soft': '#EF444420',
        warning:   '#F59E0B',
        'warning-soft': '#F59E0B20',
        muted:     '#94A3B8',
        heading:   '#F1F5F9',
        body:      '#CBD5E1',
        'surface-hover': '#273548',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Grotesk', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.2)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.25)' },
        },
      },
    },
  },
  plugins: [],
}
