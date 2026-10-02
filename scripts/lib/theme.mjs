// Two palettes, one per GitHub colour scheme. Every renderer takes a theme
// so the dark and light assets come from the same code path.

export const themes = {
  dark: {
    name: 'dark',
    bg: '#0a0a0b',
    card: '#171012',
    cardStroke: 'rgba(255,255,255,0.08)',
    grid: 'rgba(255,255,255,0.045)',
    text: '#faf6f3',
    muted: '#b5aaa6',
    faint: '#857a76',
    accent: '#c0392b',
    accent2: '#6fa89c',
    accent3: '#6fa89c',
    glow: ['#7a1f1f', '#0f3d3a', '#3b1020'],
    chipBg: 'rgba(255,255,255,0.06)',
    chipStroke: 'rgba(255,255,255,0.10)',
    cursor: '#6fa89c',
    heat: ['rgba(255,255,255,0.05)', '#4a1f1a', '#7d2a22', '#b0382a', '#dd6a55'],
    bar: 'rgba(255,255,255,0.08)',
    // Neutral greys for the sober blocks (package cards, stack): no tint at all.
    neutral: {
      card: '#141518',
      stroke: 'rgba(255,255,255,0.08)',
      text: '#f3f4f6',
      muted: '#9ca3af',
      faint: '#6b7280',
      chipBg: 'rgba(255,255,255,0.05)',
      chipStroke: 'rgba(255,255,255,0.10)',
    },
  },
  light: {
    name: 'light',
    bg: '#fcfafa',
    card: '#ffffff',
    cardStroke: 'rgba(28,25,23,0.10)',
    grid: 'rgba(28,25,23,0.05)',
    text: '#1c1917',
    muted: '#57504c',
    faint: '#a39b96',
    accent: '#a93226',
    accent2: '#2f7f73',
    accent3: '#2f7f73',
    glow: ['#f3d0d0', '#c8e9e2', '#f1d6e0'],
    chipBg: 'rgba(28,25,23,0.04)',
    chipStroke: 'rgba(28,25,23,0.10)',
    cursor: '#2f7f73',
    heat: ['rgba(28,25,23,0.06)', '#f1d0cb', '#dc9a8e', '#c0392b', '#7d2a22'],
    bar: 'rgba(28,25,23,0.08)',
    neutral: {
      card: '#ffffff',
      stroke: 'rgba(17,24,39,0.10)',
      text: '#111827',
      muted: '#4b5563',
      faint: '#9ca3af',
      chipBg: 'rgba(17,24,39,0.04)',
      chipStroke: 'rgba(17,24,39,0.10)',
    },
  },
};

export const languageColors = {
  PHP: '#c0392b',
  TypeScript: '#6fa89c',
  JavaScript: '#9cc6bd',
  Vue: '#d98b5c',
  Blade: '#a93226',
  Shell: '#d9a3ab',
  Dockerfile: '#9a3a3a',
  HTML: '#c96a3a',
  CSS: '#d27a4a',
  SCSS: '#b84360',
};

export const fonts = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};
