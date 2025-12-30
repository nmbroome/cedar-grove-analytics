/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cedar Grove LLP Brand Colors
        'cg': {
          'black': '#000000',
          'white': '#FFFFFF',
          'background': '#ECEDE5',
          'dark': '#5A5A48',
          'green': '#1CA33B',
        },
        // Override gray scale to match the warm background tone
        'gray': {
          50: '#F7F7F4',
          100: '#ECEDE5',  // matches background
          200: '#E0E1D9',
          300: '#C9CAC0',
          400: '#A5A699',
          500: '#7A7B6E',
          600: '#5A5A48',  // matches dark
          700: '#484839',
          800: '#36362B',
          900: '#24241D',
          950: '#121210',
        },
      },
      backgroundColor: {
        'page': '#ECEDE5',
      },
    },
  },
  plugins: [],
}