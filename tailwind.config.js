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
        sans: ['Manrope', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        lux: {
          50: '#F5F5F7',
          100: '#FFFFFF',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#C7C7CC',
          500: '#AEAEB2',
          600: '#86868B',
          700: '#48484A',
          800: '#1D1D1F',
          900: '#000000',
          950: '#000000',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(0, 0, 0, 0.03)',
          border: 'rgba(0, 0, 0, 0.04)',
          'border-hover': 'rgba(0, 0, 0, 0.07)',
        },
        accent: {
          indigo: '#007AFF',
          violet: '#5856D6',
          cyan: '#32ADE6',
          emerald: '#34C759',
          rose: '#FF2D55',
          amber: '#FFCC00',
          orange: '#FF9500',
        },
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.06)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
        'glass': '0 4px 16px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03)',
        'float': '0 20px 60px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '3xl': '1.5rem',
      },
      maxWidth: {
        '8xl': '96rem',
      },
      backdropBlur: {
        'xs': '4px',
        'glass': '24px',
      },
      animation: {
        'fade-in': 'lux-fade-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'lux-slide-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'lux-scale-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'bento-enter': 'lux-bento-enter 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-slow': 'lux-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'lux-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'lux-slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'lux-scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'lux-bento-enter': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'lux-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
