/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        'disney-blue': '#0066CC',
        'disney-red': '#FF3366',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { backgroundColor: 'rgb(22 163 74)' }, // bg-green-600
          '50%': { backgroundColor: 'rgb(134 239 172)' }, // bg-green-300
        },
        'pulse-blue': {
          '0%, 100%': { backgroundColor: 'rgb(96 165 250)' }, // bg-blue-400
          '50%': { backgroundColor: 'rgb(191 219 254)' }, // bg-blue-200
        },
        'pulse-yellow': {
          '0%, 100%': { backgroundColor: 'rgb(202 138 4)' }, // bg-yellow-600
          '50%': { backgroundColor: 'rgb(253 224 71)' }, // bg-yellow-300
        },
        'pulse-amber': {
          '0%, 100%': { backgroundColor: 'rgb(245 158 11)' }, // bg-amber-500
          '50%': { backgroundColor: 'rgb(252 211 77)' }, // bg-amber-300
        },
      },
      animation: {
        'pulse-green': 'pulse-green 0.5s ease-in-out',
        'pulse-blue': 'pulse-blue 0.5s ease-in-out',
        'pulse-yellow': 'pulse-yellow 0.5s ease-in-out',
        'pulse-amber': 'pulse-amber 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
