/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Ibarra Real Nova', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-hero': ['60px', { lineHeight: 1, letterSpacing: '-0.025em' }],
        'page-title': ['36px', { lineHeight: 1.1, letterSpacing: '-0.01em' }],
        'section-head': ['28px', { lineHeight: 1.2, letterSpacing: '-0.0075em' }],
        'card-header': ['20px', { lineHeight: 1.3, letterSpacing: '-0.005em' }],
        'body': ['16px', { lineHeight: 1.5 }],
        'body-sm': ['14px', { lineHeight: 1.5, letterSpacing: '0.0025em' }],
        'ui-label': ['12px', { lineHeight: 1.4, letterSpacing: '0.005em' }],
        'data': ['14px', { lineHeight: 1.5 }],
      },
      spacing: {
        '1': '0.25rem',   /* 4px - space-1 */
        '2': '0.5rem',    /* 8px - space-2 */
        '3': '0.75rem',   /* 12px - space-3 */
        '4': '1rem',      /* 16px - space-4 */
        '5': '1.5rem',    /* 24px - space-5 */
        '6': '2rem',      /* 32px - space-6 */
        '7': '2.5rem',    /* 40px - space-7 */
        '8': '3rem',      /* 48px - space-8 */
        '9': '4rem',      /* 64px - space-9 */
      },
      colors: {
        lux: {
          50: '#FAF9F7',
          100: '#F3F1EE',
          200: '#E8E6E3',
          300: '#D5D3CF',
          400: '#A09E9A',
          500: '#8A8A8A',
          600: '#5A5A5A',
          700: '#4A4A4A',
          800: '#2D2D2D',
          900: '#1A1A2E',
          950: '#0D0D1A',
          gold: '#B8860B',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(0, 0, 0, 0.03)',
          border: 'rgba(0, 0, 0, 0.06)',
          'border-hover': 'rgba(0, 0, 0, 0.1)',
        },
        accent: {
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          warm: '#FBF8F3',
          'warm-border': '#F0EADE',
        },
      },
      borderRadius: {
        'lux-card': '20px',
        'lux-input': '10px',
        'lux-modal': '16px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'soft': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'glass': '0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03)',
        'float': '0 20px 60px rgba(0, 0, 0, 0.08)',
      },
      maxWidth: {
        '8xl': '96rem',
      },
      keyframes: {
        'lux-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'lux-slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'lux-scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'lux-bento-enter': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'lux-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'lux-slide-left': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'lux-slide-right': {
          from: { opacity: '0', transform: 'translateX(-100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'lux-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'lux-slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-left': 'lux-slide-left 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-right': 'lux-slide-right 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'lux-scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'bento-enter': 'lux-bento-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-slow': 'lux-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
