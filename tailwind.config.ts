import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'fade-slide-up':  'fadeSlideUp  300ms cubic-bezier(.22,1,.36,1) both',
        'pulse-live':     'pulseLive    1.5s  ease-in-out infinite',
        'score-bump':     'scoreBump    350ms cubic-bezier(.36,.07,.19,.97) both',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(.22,1,.36,1) both',
        'dropdown-in':    'dropdownIn   200ms cubic-bezier(.22,1,.36,1) both',
        'toast-in':       'toastIn      320ms cubic-bezier(.34,1.56,.64,1) both',
      },
      colors: {
        hippo: {
          bg: 'var(--hippo-bg)',
          fg: 'var(--hippo-fg)',
          primary: 'var(--hippo-primary)',
          'primary-fg': 'var(--hippo-primary-fg)',
          'primary-light': 'var(--hippo-primary-light)',
          secondary: 'var(--hippo-secondary)',
          'secondary-fg': 'var(--hippo-secondary-fg)',
          surface: 'var(--hippo-surface)',
          border: 'var(--hippo-border)',
          muted: 'var(--hippo-muted)',
          'muted-fg': 'var(--hippo-muted-fg)',
          error: 'var(--hippo-error)',
          success: 'var(--hippo-success)',
          live: 'var(--hippo-live)',
          'warn-bg': 'var(--hippo-warn-bg)',
          'warn-fg': 'var(--hippo-warn-fg)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
