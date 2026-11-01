import { esc, formatNumber } from '../util.mjs';
import { fonts } from '../theme.mjs';

// A neofetch-style system card: the contribution grid of the last 8 weeks
// stands in for the ASCII logo, key/value lines reveal one by one, and a
// palette row closes the block like the real tool does.

const W = 900;
const H = 300;
const SIZE = 13.5;
const CHAR = SIZE * 0.6;
const LINE = 23;

const mono = (text, x, y, fill, weight = 400) =>
  `<text class="mono" x="${x}" y="${y}" font-size="${SIZE}" font-weight="${weight}" fill="${fill}" textLength="${(text.length * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;

// The card body, reusable as the output of a command in the terminal style.
// Returns the markup, its height and the time at which its animation ends.
export function systemBlock({ config, stats, theme: t, x: originX = 44, y: originY = 62, start = 0.7 }) {
  const gh = stats.github;
  // stackSummary is the short, grouped line for the card; the full stack
  // block lives further down the page.
  const stack = (config.stackSummary ?? Object.values(config.stack ?? {}).flat().slice(0, 6)).join(' · ');
  const rows = [
    ['role', config.title.toLowerCase()],
    ['location', config.location],
    ['stack', stack],
    ['packages', `${config.packages.length} · ${stats.totals.releases} releases · ${formatNumber(stats.totals.monthly)} installs/month`],
    ['contributions', gh ? `${formatNumber(gh.contributionsTotal ?? gh.contributions)} all time · ${formatNumber(gh.contributions)} this year` : 'syncing…'],
    ['streak', gh ? `${stats.streak.current} days · longest ${stats.streak.longest}` : 'syncing…'],
    ['site', config.website.replace(/^https?:\/\//, '')],
  ];
  const keyW = 14;

  // Logo: last 8 weeks of the contribution grid, as big cells.
  const weeks = (stats.weeks ?? []).slice(-8);
  const max = Math.max(1, ...weeks.flat().map((d) => d?.count ?? 0));
  const cell = 18;
  const gap = 5;
  const logoX = originX;
  const logoY = originY;
  const cells = [];
  weeks.forEach((week, wi) =>
    week.forEach((day, di) => {
      if (!day) return;
      const r = day.count / max;
      const fill = !day.count ? t.heat[0] : r > 0.75 ? t.heat[4] : r > 0.5 ? t.heat[3] : r > 0.25 ? t.heat[2] : t.heat[1];
      cells.push(`<rect x="${logoX + wi * (cell + gap)}" y="${logoY + di * (cell + gap)}" width="${cell}" height="${cell}" rx="4" fill="${fill}" class="cell" style="animation-delay:${(0.1 + wi * 0.06 + di * 0.02).toFixed(2)}s"/>`);
    }),
  );
  const logoW = weeks.length * (cell + gap) - gap;

  const textX = logoX + logoW + 48;
  let y = originY + 14;
  let time = start;
  const lines = [];
  const header = `${config.login}@github`;
  lines.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">${mono(header, textX, y, t.accent, 700)}</g>`);
  y += LINE;
  lines.push(`<g class="out" style="animation-delay:${(time + 0.1).toFixed(2)}s">${mono('─'.repeat(header.length), textX, y, t.faint)}</g>`);
  y += LINE;
  time += 0.3;
  for (const [k, v] of rows) {
    lines.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">
      ${mono(k, textX, y, t.accent)}
      ${mono(v, textX + keyW * CHAR, y, t.text)}
    </g>`);
    y += LINE;
    time += 0.18;
  }
  // Palette row.
  const palette = [t.accent, t.heat[4], t.heat[3], t.heat[2], t.heat[1], t.chipStroke, t.faint, t.muted];
  y += 6;
  lines.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">${palette
    .map((c, i) => `<rect x="${textX + i * 24}" y="${y - 12}" width="20" height="12" rx="2" fill="${c}"/>`)
    .join('')}</g>`);

  const bottom = Math.max(y + 4, logoY + 7 * (cell + gap) + 20);
  return {
    markup: `${cells.join('\n    ')}
    ${mono('last 8 weeks', logoX, logoY + 7 * (cell + gap) + 14, t.faint)}
    ${lines.join('\n    ')}`,
    height: bottom - originY,
    end: time + 0.2,
  };
}

export function renderHero({ config, stats, theme: t }) {
  const block = systemBlock({ config, stats, theme: t });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(config.name)}, ${esc(config.title)}, ${esc(config.location)}">
  <title>${esc(config.name)} · ${esc(config.title)}</title>
  <style>
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    .cell { opacity: 0; animation: pop .4s cubic-bezier(.2,.7,.2,1) forwards; transform-box: fill-box; transform-origin: center; }
    @keyframes show { to { opacity: 1; } }
    @keyframes pop { from { opacity: 0; transform: scale(.3); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .out, .cell { animation: none; opacity: 1; transform: none; } }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${t.grid}"/></pattern>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#dots)"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.cardStroke}"/>
    ${block.markup}
  </g>
</svg>
`;
}
