import { esc, formatNumber } from '../util.mjs';
import { fonts } from '../theme.mjs';

// Minimal: the name decodes letter by letter from random glyphs, a single
// metrics line follows, and a thin live contribution line closes the block.

const W = 900;
const H = 260;
const GLYPHS = '#$%&@*+=/\\<>{}[]01';

// Deterministic pseudo-random so the asset is stable between builds.
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function renderHero({ config, stats, theme: t }) {
  const rand = rng(42);
  const name = config.name;
  const size = 54;
  const charW = size * 0.62;
  const x0 = 44;
  const y0 = 118;
  const steps = 4;
  const letters = [...name].map((ch, i) => {
    if (ch === ' ') return '';
    const x = x0 + i * charW;
    const start = 0.2 + i * 0.07;
    const frames = Array.from({ length: steps }, () => GLYPHS[Math.floor(rand() * GLYPHS.length)]);
    const parts = frames.map(
      (g, k) =>
        `<text class="mono glyph" x="${x.toFixed(1)}" y="${y0}" font-size="${size}" font-weight="700" fill="${t.faint}" style="animation-delay:${(start + k * 0.08).toFixed(2)}s">${esc(g)}</text>`,
    );
    parts.push(
      `<text class="mono final" x="${x.toFixed(1)}" y="${y0}" font-size="${size}" font-weight="700" fill="${t.text}" style="animation-delay:${(start + steps * 0.08).toFixed(2)}s">${esc(ch)}</text>`,
    );
    return parts.join('');
  });

  const gh = stats.github;
  const meta = `${config.title.toLowerCase()} · ${config.location}`;
  const metrics = [
    `${config.packages.length} packages`,
    `${stats.totals.releases} releases`,
    `${formatNumber(stats.totals.monthly)} installs/month`,
    gh ? `${formatNumber(gh.contributionsTotal ?? gh.contributions)} contributions` : null,
  ].filter(Boolean);

  // Thin contribution line across the bottom.
  const series = stats.spark ?? [];
  const max = Math.max(1, ...series);
  const lx = 44;
  const lw = W - 88;
  const ly = 214;
  const lh = 26;
  const pts = series.map((v, i) => [lx + (i * lw) / Math.max(1, series.length - 1), ly - (v / max) * lh]);
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const len = pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  const totalDelay = 0.2 + name.length * 0.07 + steps * 0.08;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(config.name)}, ${esc(meta)}">
  <title>${esc(config.name)} · ${esc(config.title)}</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .glyph { opacity: 0; animation: flash .08s linear forwards; }
    .final { opacity: 0; animation: show .01s linear forwards; }
    .out { opacity: 0; animation: fade .6s ease-out forwards; }
    .draw { stroke-dasharray: ${len.toFixed(0)}; stroke-dashoffset: ${len.toFixed(0)}; animation: draw 1.6s cubic-bezier(.4,0,.2,1) forwards; }
    .cursor { animation: blink 1s steps(2, start) infinite; }
    @keyframes flash { 0%, 95% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes show { to { opacity: 1; } }
    @keyframes fade { to { opacity: 1; } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes blink { 50% { visibility: hidden; } }
    @media (prefers-reduced-motion: reduce) { .glyph { display: none; } .final, .out { animation: none; opacity: 1; } .draw { animation: none; stroke-dashoffset: 0; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.cardStroke}"/>
    <text class="mono out" x="44" y="56" font-size="12" letter-spacing=".5" fill="${t.accent}" style="animation-delay:.05s">// ${esc(config.login)}</text>
    ${letters.join('\n    ')}
    <rect class="cursor" x="${(x0 + name.length * charW + 6).toFixed(1)}" y="${y0 - size + 8}" width="4" height="${size}" fill="${t.accent}"/>
    <text class="out" x="44" y="152" font-size="15" fill="${t.muted}" style="animation-delay:${(totalDelay + 0.1).toFixed(2)}s">${esc(meta)}</text>
    <text class="mono out" x="44" y="180" font-size="12.5" fill="${t.faint}" style="animation-delay:${(totalDelay + 0.4).toFixed(2)}s">${esc(metrics.join('   ·   '))}</text>
    <path class="draw" d="${d}" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-linejoin="round" style="animation-delay:${(totalDelay + 0.6).toFixed(2)}s"/>
    <text class="mono out" x="${W - 44}" y="${ly + 22}" text-anchor="end" font-size="10.5" letter-spacing=".4" fill="${t.faint}" style="animation-delay:${(totalDelay + 1.2).toFixed(2)}s">CONTRIBUTIONS · LAST 16 WEEKS</text>
  </g>
</svg>
`;
}
