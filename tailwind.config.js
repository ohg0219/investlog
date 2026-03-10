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
        ink: '#0a0a08',
        paper: '#f4f0e8',
        cream: '#ede9df',
        'warm-mid': '#c8c0b0',
        accent: '#c8a96e',
        'accent-dim': '#8a7248',
        green: {
          DEFAULT: '#3d6b4f',
          pale: '#ddeee4',
          bright: '#6bba8a',
        },
        red: {
          DEFAULT: '#8b3a3a',
          pale: '#f0dede',
          bright: '#d07070',
        },
        blue: {
          DEFAULT: '#2c4a6e',
          pale: '#dde6f0',
          bright: '#6898cc',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
        kr: ['Noto Serif KR', 'Malgun Gothic', 'serif'],
      },
    },
  },
  plugins: [],
}
