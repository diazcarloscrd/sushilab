import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Japanese Artisanal Craft Palette
        primary: '#a62216',
        'on-primary': '#ffffff',
        'primary-container': '#c93b2b',
        'on-primary-container': '#ffefed',
        'inverse-primary': '#ffb4a8',
        'primary-fixed': '#ffdad4',
        'primary-fixed-dim': '#ffb4a8',
        'on-primary-fixed': '#410000',
        'on-primary-fixed-variant': '#900e07',

        secondary: '#755a2a',
        'on-secondary': '#ffffff',
        'secondary-container': '#fdd79c',
        'on-secondary-container': '#785c2c',
        'secondary-fixed': '#ffdeaa',
        'secondary-fixed-dim': '#e5c187',
        'on-secondary-fixed': '#271900',
        'on-secondary-fixed-variant': '#5b4314',

        tertiary: '#3d5d43',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#55765a',
        'on-tertiary-container': '#d6fcd9',
        'tertiary-fixed': '#c7ecca',
        'tertiary-fixed-dim': '#abd0af',
        'on-tertiary-fixed': '#02210c',
        'on-tertiary-fixed-variant': '#2e4e35',

        surface: '#fff8f6',
        'surface-dim': '#e2d8d6',
        'surface-bright': '#fff8f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fcf1ef',
        'surface-container': '#f6ecea',
        'surface-container-high': '#f0e6e4',
        'surface-container-highest': '#eae0de',
        'surface-variant': '#eae0de',
        'surface-tint': '#b22a1d',

        'on-surface': '#1f1b1a',
        'on-surface-variant': '#5a413d',
        'inverse-surface': '#352f2e',
        'inverse-on-surface': '#f9eeec',
        outline: '#8e706b',
        'outline-variant': '#e2beb9',
        background: '#fff8f6',
        'on-background': '#1f1b1a',

        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        headline: ['var(--font-plus-jakarta)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        display: ['var(--font-plus-jakarta)', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(43, 38, 37, 0.06)',
        elevated: '0 4px 16px -4px rgba(43, 38, 37, 0.10)',
        'floating-bar': '0 12px 32px -6px rgba(43, 38, 37, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
