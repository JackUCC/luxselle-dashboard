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
        sans: ['Manrope', 'sans-serif'], // Main body font (Clean, modern)
        display: ['Sora', 'sans-serif'], // Headings
        mono: ['JetBrains Mono', 'monospace'], // Data/Code
      },
      colors: {
        lux: {
          50: '#F5F5F7', // Apple Background
          100: '#FFFFFF', // Surfaces
          200: '#E5E5EA', // Borders/Separators
          300: '#D1D1D6', // Disabled/Placeholder
          400: '#C7C7CC',
          500: '#AEAEB2', // Icons
          600: '#8E8E93', // Secondary Text
          700: '#48484A',
          800: '#1C1C1E', // Primary Text
          900: '#000000',
          950: '#000000',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.65)',
          dark: 'rgba(0, 0, 0, 0.05)',
          border: 'rgba(0, 0, 0, 0.05)',
          'border-hover': 'rgba(0, 0, 0, 0.1)',
        },
        accent: {
          indigo: '#007AFF', // Apple Blue
          violet: '#5856D6', // Apple Purple
          cyan: '#32ADE6',   // Apple Cyan
          emerald: '#34C759', // Apple Green
          rose: '#FF2D55',    // Apple Pink/Red
          amber: '#FFCC00',   // Apple Yellow
          orange: '#FF9500',  // Apple Orange
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 12px 24px rgba(0, 0, 0, 0.06)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'glass-lg': '0 24px 64px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'float': '0 16px 48px rgba(0, 0, 0, 0.1)',
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
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
