/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F8F8F6',
          surface: '#FFFFFF',
          subtle: '#F2F2EE',
          muted: '#EBEBE6',
        },
        text: {
          primary: '#171717',
          secondary: '#6B6B67',
          muted: '#8C8C87',
        },
        border: {
          subtle: '#E5E5E0',
          dark: '#D0D0C8',
        },
        accent: {
          navy: '#17324D',
          'navy-light': '#244565',
          'navy-dark': '#0E2033',
          green: '#3F6B5B',
          'green-light': '#4D816E',
          'green-subtle': '#EEF5F2',
          amber: '#B45309',
          'amber-subtle': '#FEF3C7',
          red: '#B91C1C',
          'red-subtle': '#FEE2E2',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Geist',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Geist Mono',
          'ui-monospace',
          'monospace',
        ],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        DEFAULT: '10px',
        lg: '12px',
        xl: '14px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        dropdown: '0 4px 12px rgba(0, 0, 0, 0.08)',
        modal: '0 12px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
