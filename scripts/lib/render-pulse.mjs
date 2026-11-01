import { esc, formatNumber } from './util.mjs';
import { fonts } from './theme.mjs';

// Pulse: contributions per month over the last twelve months as bars, with
// package releases marked on the same timeline.

const W = 900;
const H = 230;
const PAD = 40;

export function renderPulse({ config, stats, theme: t, now }) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }), contributions: 0, releases: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const [date, count] of stats.github?.days ?? []) {
    const m = byKey.get(date.slice(0, 7));
    if (m) m.contributions += count;
  }
  for (const pkg of config.packages) {
    const released = stats.packages[pkg.name]?.releasedAt;
    const m = released && byKey.get(released.slice(0, 7));
    if (m) m.releases++;
  }
  const max = Math.max(1, ...months.map((m) => m.contributions));
  const chartX = PAD;
  const chartW = W - PAD * 2;
  const top = 64;
  const baseY = 164;
  const chartH = baseY - top;
  const slot = chartW / months.length;
  const barW = Math.round(slot * 0.5);
  const total = months.reduce((a, m) => a + m.contributions, 0);
  const releases = months.reduce((a, m) => a + m.releases, 0);

  const bars = months
    .map((m, i) => {
      const h = Math.max(2, Math.round((m.contributions / max) * chartH));
      const x = chartX + i * slot + (slot - barW) / 2;
      const last = i === months.length - 1;
      return `
    <g class="rise" style="animation-delay:${(0.15 + i * 0.05).toFixed(2)}s">
      <rect x="${x.toFixed(1)}" y="${baseY - h}" width="${barW}" height="${h}" rx="4" fill="${last ? t.accent : t.heat[2]}" class="bar" style="animation-delay:${(0.2 + i * 0.05).toFixed(2)}s"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${baseY - h - 8}" text-anchor="middle" font-size="10.5" class="mono" fill="${t.faint}">${m.contributions ? formatNumber(m.contributions) : ''}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${baseY + 18}" text-anchor="middle" font-size="11" fill="${t.faint}">${m.label}</text>
      ${m.releases ? `<g class="pop" style="animation-delay:${(0.8 + i * 0.05).toFixed(2)}s"><circle cx="${(x + barW / 2).toFixed(1)}" cy="${baseY + 34}" r="${3 + Math.min(3, m.releases)}" fill="${t.accent}"/><text x="${(x + barW / 2).toFixed(1)}" y="${baseY + 54}" text-anchor="middle" font-size="10" class="mono" fill="${t.faint}">${m.releases}</text></g>` : ''}
    </g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contributions per month and releases over the last twelve months">
  <title>Pulse</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .rise { opacity: 0; animation: rise .5s cubic-bezier(.2,.7,.2,1) forwards; }
    .bar { transform: scaleY(0); transform-box: fill-box; transform-origin: bottom; animation: grow .7s cubic-bezier(.2,.7,.2,1) forwards; }
    .pop { opacity: 0; animation: pop .4s cubic-bezier(.2,.7,.2,1) forwards; transform-box: fill-box; transform-origin: center; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes grow { to { transform: scaleY(1); } }
    @keyframes pop { from { opacity: 0; transform: scale(.3); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .rise, .bar, .pop { animation: none; opacity: 1; transform: none; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.cardStroke}"/>
    <text x="${PAD}" y="36" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}">CONTRIBUTIONS PER MONTH · LAST 12 MONTHS</text>
    <text x="${W - PAD}" y="36" text-anchor="end" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}"><tspan font-size="13" font-weight="800" fill="${t.text}">${formatNumber(total)}</tspan> CONTRIBUTIONS · <tspan font-size="13" font-weight="800" fill="${t.text}">${releases}</tspan> RELEASES</text>
    <line x1="${PAD}" y1="${baseY}" x2="${W - PAD}" y2="${baseY}" stroke="${t.cardStroke}"/>
    ${bars}
    <text x="${PAD}" y="${baseY + 54}" font-size="10" font-weight="600" letter-spacing=".3" fill="${t.faint}">● LATEST RELEASES</text>
  </g>
</svg>
`;
}
