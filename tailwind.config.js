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
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        lux: {
          50: '#FAFAFA',
          100: '#FFFFFF',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
          gold: '#c3a363',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(0, 0, 0, 0.03)',
          border: 'rgba(0, 0, 0, 0.06)',
          'border-hover': 'rgba(0, 0, 0, 0.1)',
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
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'soft': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
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
        'fade-in': 'lux-fade-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'lux-slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'lux-scale-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'bento-enter': 'lux-bento-enter 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-slow': 'lux-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
