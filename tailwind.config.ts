import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0a0a0f',
          1: '#111118',
          2: '#1a1a24',
          3: '#22222f',
          4: '#2a2a3a',
        },
        accent: {
          blue: '#4f8ef7',
          purple: '#8b5cf6',
        },
        gain: {
          DEFAULT: '#22c55e',
          dim: '#16a34a',
          bg: 'rgba(34,197,94,0.08)',
        },
        loss: {
          DEFAULT: '#ef4444',
          dim: '#dc2626',
          bg: 'rgba(239,68,68,0.08)',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
