import { esc, formatNumber, relativeTime } from './util.mjs';
import { fonts } from './theme.mjs';

// Shipping log renderers. `entries` are the latest releases, newest first:
// { name, version, releasedAt, summary, registry }.

const W = 900;

const mono = (text, x, y, fill, size, weight = 400, anchor = 'start') =>
  `<text class="mono" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;

const frame = (H, t, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
  <title>Shipping log</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    .rise { opacity: 0; animation: rise .5s cubic-bezier(.2,.7,.2,1) forwards; }
    .pop { opacity: 0; animation: pop .4s cubic-bezier(.2,.7,.2,1) forwards; transform-box: fill-box; transform-origin: center; }
    .draw { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: draw 1.4s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes show { to { opacity: 1; } }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pop { from { opacity: 0; transform: scale(.3); } to { opacity: 1; transform: scale(1); } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .out, .rise, .pop { animation: none; opacity: 1; transform: none; } .draw { animation: none; stroke-dashoffset: 0; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.cardStroke}"/>
    ${body}
  </g>
</svg>
`;

// 1. git log: a commit-graph column, one line per release, typed header.
export function renderGitLog({ entries, theme: t, now }) {
  const LINE = 30;
  const top = 76;
  const H = top + entries.length * LINE + 8;
  const header = `$ git log --releases -n ${entries.length}`;
  const lines = entries.map((e, i) => {
    const y = top + i * LINE;
    const delay = 0.9 + i * 0.16;
    const summary = e.summary.length > 52 ? `${e.summary.slice(0, 51).trimEnd()}…` : e.summary;
    return `
    <g class="out" style="animation-delay:${delay.toFixed(2)}s">
      <circle cx="40" cy="${y - 5}" r="4.5" fill="${i === 0 ? t.accent : t.bg}" stroke="${i === 0 ? t.accent : t.faint}" stroke-width="1.5"/>
      ${mono(`v${e.version}`, 60, y, t.accent, 13, 700)}
      ${mono(e.name, 136, y, t.text, 13, 600)}
      <text x="${W - 40}" y="${y}" text-anchor="end" font-size="12" class="mono" fill="${t.faint}">${esc(e.releasedAt.slice(0, 10))}</text>
      <text x="352" y="${y}" font-size="12.5" fill="${t.muted}">${esc(summary)}</text>
    </g>`;
  });
  const body = `
    <line class="draw" x1="40" y1="${top - 5}" x2="40" y2="${top + (entries.length - 1) * LINE - 5}" stroke="${t.chipStroke}" stroke-width="2" style="animation-delay:.8s"/>
    <clipPath id="c"><rect x="40" y="26" width="0" height="26"><animate attributeName="width" from="14" to="${header.length * 8.4 + 4}" dur="${(header.length * 0.03).toFixed(2)}s" begin="0.2s" fill="freeze"/></rect></clipPath>
    <g clip-path="url(#c)">
      ${mono('$', 40, 44, t.accent, 14, 700)}
      <text class="mono" x="58" y="44" font-size="14" fill="${t.text}" textLength="${((header.length - 2) * 8.4).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(header.slice(2))}</text>
    </g>
    ${lines.join('')}`;
  return frame(H, t, body, `Latest releases: ${entries.map((e) => `${e.name} ${e.version}`).join(', ')}`);
}

// 2. timeline: the last 90 days on one axis, one dot per release day with
// the releases of that day stacked above or below it.
export function renderTimeline({ entries, theme: t, now }) {
  const DAYS = 90;
  const x0 = 60;
  const x1 = W - 60;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - DAYS);
  const xFor = (d) => x0 + ((new Date(d) - start) / (end - start)) * (x1 - x0);
  const groups = new Map();
  for (const e of entries.filter((e) => new Date(e.releasedAt) >= start)) {
    const day = e.releasedAt.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(e);
  }
  const days = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const LINE = 16;
  const tallest = Math.max(1, ...days.map(([, list]) => list.length));
  const axisY = 70 + tallest * LINE;
  const H = axisY + 40 + (days.length > 1 ? tallest * LINE + 16 : 0);
  const ticks = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + Math.round((DAYS * i) / 3));
    ticks.push(`<text x="${xFor(d).toFixed(1)}" y="${axisY + 24}" text-anchor="middle" font-size="11" fill="${t.faint}">${d.toLocaleString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>`);
  }
  const placed = [];
  const dots = days.map(([day, list], gi) => {
    let x = xFor(day);
    for (const p of placed) if (Math.abs(p - x) < 120) x = p + 120;
    placed.push(x);
    const above = gi % 2 === 0;
    const newest = gi === days.length - 1;
    const labels = list.map((e, i) => {
      const ly = above ? axisY - 30 - (list.length - 1 - i) * LINE : axisY + 50 + i * LINE;
      return mono(`${e.name} v${e.version}`, x.toFixed(1), ly, newest ? t.text : t.muted, 12, newest ? 600 : 500, 'middle');
    });
    const dateY = above ? axisY - 30 - list.length * LINE : axisY + 50 + list.length * LINE;
    return `
    <g class="pop" style="animation-delay:${(0.5 + gi * 0.15).toFixed(2)}s">
      <line x1="${x.toFixed(1)}" y1="${axisY}" x2="${x.toFixed(1)}" y2="${above ? axisY - 18 : axisY + 34}" stroke="${t.chipStroke}"/>
      <circle cx="${x.toFixed(1)}" cy="${axisY}" r="${newest ? 6 : 4.5}" fill="${newest ? t.accent : t.bg}" stroke="${newest ? t.accent : t.muted}" stroke-width="1.5"/>
      ${labels.join('')}
      ${mono(`${day} · ${relativeTime(day, now)}`, x.toFixed(1), dateY, t.faint, 10.5, 400, 'middle')}
    </g>`;
  });
  const total = days.reduce((a, [, l]) => a + l.length, 0);
  const body = `
    <text x="40" y="36" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}">RELEASES · LAST 90 DAYS</text>
    <text x="${W - 40}" y="36" text-anchor="end" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}"><tspan font-size="13" font-weight="800" fill="${t.text}">${total}</tspan> RELEASES</text>
    <line class="draw" x1="${x0}" y1="${axisY}" x2="${x1}" y2="${axisY}" stroke="${t.chipStroke}" stroke-width="2" style="animation-delay:.1s"/>
    ${ticks.join('')}
    ${dots.join('')}`;
  return frame(H, t, body, `Releases in the last 90 days: ${entries.map((e) => `${e.name} ${e.version}`).join(', ')}`);
}

// 3. list: plain markdown, one line per release.
export function renderList({ entries, now }) {
  return entries
    .map((e) => `- <code>${e.releasedAt.slice(0, 10)}</code> · [**${e.name}**](${e.repo}) <code>v${e.version}</code> — ${e.summary} <sub>${relativeTime(e.releasedAt, now)}</sub>`)
    .join('\n');
}
