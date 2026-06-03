import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hippo: {
          bg: 'var(--hippo-bg)',
          fg: 'var(--hippo-fg)',
          primary: 'var(--hippo-primary)',
          'primary-fg': 'var(--hippo-primary-fg)',
          secondary: 'var(--hippo-secondary)',
          'secondary-fg': 'var(--hippo-secondary-fg)',
          surface: 'var(--hippo-surface)',
          border: 'var(--hippo-border)',
          muted: 'var(--hippo-muted)',
          'muted-fg': 'var(--hippo-muted-fg)',
          error: 'var(--hippo-error)',
          success: 'var(--hippo-success)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
