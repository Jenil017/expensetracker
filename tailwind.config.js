/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEF5FD',
          100: '#C4E2F5',
          200: '#93CAED',
          300: '#4BB8FA',
          400: '#1591DC',
          500: '#2C5EAD',
          600: '#1E4A8A',
          700: '#163870',
          800: '#0D2450',
          900: '#071530',
        },
        credit: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        debit: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['"Roboto"', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:       '0 2px 12px rgba(44, 94, 173, 0.08)',
        'card-lg':  '0 4px 24px rgba(44, 94, 173, 0.14)',
        fab:        '0 4px 20px rgba(21, 145, 220, 0.45)',
        'bottom-nav': '0 -2px 16px rgba(44, 94, 173, 0.1)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2C5EAD 0%, #1591DC 100%)',
        'credit-gradient': 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
        'debit-gradient':  'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
      },
    },
  },
  plugins: [],
}
