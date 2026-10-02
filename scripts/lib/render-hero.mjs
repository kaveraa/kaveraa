import { esc, formatNumber } from './util.mjs';
import { fonts } from './theme.mjs';

const W = 900;
const H = 280;

// Typewriter timing, in seconds. Each phrase: type, hold, erase, pause.
const TYPE = 2.2;
const HOLD = 2.6;
const ERASE = 0.9;
const PAUSE = 0.3;
const SLOT = TYPE + HOLD + ERASE + PAUSE;

const typewriter = (phrases, t, x, y) => {
  const size = 14;
  const charW = size * 0.6; // forced with textLength, so this is exact
  const total = SLOT * phrases.length;
  return phrases
    .map((phrase, i) => {
      const width = phrase.length * charW;
      const s = (i * SLOT) / total;
      const k = (v) => (s + v / total).toFixed(4);
      const keyTimes = ['0', k(0), k(TYPE), k(TYPE + HOLD), k(TYPE + HOLD + ERASE), '1'].join(';');
      const widths = `0;0;${width};${width};0;0`;
      const cursorX = `${x};${x};${x + width};${x + width};${x};${x}`;
      const visible = `0;1;1;1;1;0`;
      return `
    <clipPath id="tw${i}"><rect x="${x}" y="${y - size}" height="${size * 1.6}" width="0">
      <animate attributeName="width" values="${widths}" keyTimes="${keyTimes}" calcMode="linear" dur="${total}s" repeatCount="indefinite"/>
    </rect></clipPath>
    <text class="mono" x="${x}" y="${y}" font-size="${size}" fill="${t.muted}" clip-path="url(#tw${i})" textLength="${width}" lengthAdjust="spacingAndGlyphs">${esc(phrase)}</text>
    <rect class="cursor" x="${x}" y="${y - size + 1}" width="2" height="${size + 3}" fill="${t.accent}" opacity="0">
      <animate attributeName="x" values="${cursorX}" keyTimes="${keyTimes}" calcMode="linear" dur="${total}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="${visible}" keyTimes="${keyTimes}" calcMode="discrete" dur="${total}s" repeatCount="indefinite"/>
    </rect>`;
    })
    .join('');
};

const sparkline = (series, t, x, y, w, h) => {
  if (!series?.length) return '';
  const max = Math.max(...series, 1);
  const step = w / (series.length - 1);
  const pts = series.map((v, i) => [x + i * step, y + h - (v / max) * h]);
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${d} L${(x + w).toFixed(1)} ${y + h} L${x} ${y + h} Z`;
  const len = pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  return `
    <path d="${area}" fill="url(#sparkFill)" class="fade" style="animation-delay:1.6s"/>
    <path d="${d}" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}" class="draw" style="animation-delay:1.1s"/>
    <circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="3.5" fill="${t.accent}" class="fade" style="animation-delay:2.2s"/>`;
};

export function renderHero({ config, stats, theme: t }) {
  const metrics = [
    { value: config.packages.length, label: 'packages' },
    { value: stats.totals.releases, label: 'releases' },
    { value: stats.totals.monthly, label: 'installs / month' },
  ];
  const panelX = 522;
  const panelY = 36;
  const panelW = 340;
  const panelH = 208;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(config.name)}, ${esc(config.title)}">
  <title>${esc(config.name)} · ${esc(config.title)}</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .rise { opacity: 0; animation: rise .7s cubic-bezier(.2,.7,.2,1) forwards; }
    .fade { opacity: 0; animation: fade .9s ease-out forwards; }
    .draw { animation: draw 1.6s cubic-bezier(.4,0,.2,1) forwards; }
    .cursor { animation: blink 1s steps(2, start) infinite; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fade { to { opacity: 1; } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes blink { 50% { visibility: hidden; } }
    @media (prefers-reduced-motion: reduce) {
      .rise, .fade, .draw { animation: none; opacity: 1; stroke-dashoffset: 0; }
    }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath>
    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.accent}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${t.grid}"/>
    </pattern>
  </defs>

  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#dots)"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${t.cardStroke}"/>

    <!-- left column -->
    <g class="rise" style="animation-delay:.05s">
      <rect x="44" y="44" width="178" height="24" rx="12" fill="${t.chipBg}" stroke="${t.chipStroke}"/>
      <circle cx="58" cy="56" r="4" fill="${t.accent}"/>
      <text x="70" y="60" font-size="11.5" font-weight="600" letter-spacing=".4" fill="${t.muted}">${esc(config.title.toUpperCase())}</text>
    </g>
    <text class="rise" style="animation-delay:.2s" x="44" y="120" font-size="46" font-weight="800" letter-spacing="-1.2" fill="${t.text}">${esc(config.name)}</text>
    <g class="rise" style="animation-delay:.4s">
      <text x="44" y="152" font-size="15" fill="${t.muted}">${esc(config.location)}</text>
    </g>
    <g class="fade" style="animation-delay:.7s">
      <text class="mono" x="44" y="200" font-size="14" fill="${t.accent}">$</text>
      ${typewriter(config.typewriter, t, 62, 200)}
    </g>

    <!-- right panel -->
    <g class="rise" style="animation-delay:.5s">
      <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="18" fill="${t.card}" fill-opacity="${t.name === 'dark' ? 0.55 : 0.75}" stroke="${t.cardStroke}"/>
      ${metrics
        .map((m, i) => {
          // Left, centre and right anchored so long labels never overflow the panel.
          const anchor = ['start', 'middle', 'end'][i];
          const mx = [panelX + 20, panelX + panelW * 0.4, panelX + panelW - 20][i];
          return `
      <g class="rise" style="animation-delay:${(0.8 + i * 0.12).toFixed(2)}s">
        <text x="${mx}" y="${panelY + 50}" text-anchor="${anchor}" font-size="26" font-weight="800" letter-spacing="-.5" fill="${t.text}">${formatNumber(m.value)}</text>
        <text x="${mx}" y="${panelY + 68}" text-anchor="${anchor}" font-size="10.5" font-weight="600" letter-spacing=".2" fill="${t.faint}">${esc(m.label.toUpperCase())}</text>
      </g>`;
        })
        .join('')}
      <line x1="${panelX + 20}" y1="${panelY + 90}" x2="${panelX + panelW - 20}" y2="${panelY + 90}" stroke="${t.cardStroke}"/>
      <text x="${panelX + 20}" y="${panelY + 112}" font-size="10.5" font-weight="600" letter-spacing=".3" fill="${t.faint}">${
        stats.github
          ? `<tspan font-size="13" font-weight="800" fill="${t.text}">${formatNumber(stats.github.contributionsTotal ?? stats.github.contributions)}</tspan> CONTRIBUTIONS`
          : 'RELEASES'
      }</text>
      <text x="${panelX + panelW - 20}" y="${panelY + 112}" text-anchor="end" font-size="10.5" font-weight="600" letter-spacing=".3" fill="${t.faint}">LAST 16 WEEKS</text>
      ${sparkline(stats.spark, t, panelX + 20, panelY + 124, panelW - 40, 60)}
    </g>
  </g>
</svg>
`;
}
