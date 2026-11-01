import { esc, formatNumber } from '../util.mjs';
import { fonts } from '../theme.mjs';

// A neofetch card: the ASCII portrait (data/portrait.txt) on the left and,
// on the right, dotted key/value lines grouped under ruled section titles.
// Everything is monospace, so widths are forced with textLength.

const W = 900;
const PAD = 36;
const SIZE = 13;
const CHAR = SIZE * 0.6;
const LINE = 21;
const ART_SIZE = 11;
const ART_CHAR = ART_SIZE * 0.6;
const ART_LINE = 13.2;
const COL_X = 392;
const COLS = Math.floor((W - PAD - COL_X) / CHAR); // characters per line in the right column

const mono = (text, x, y, fill, weight = 400) =>
  `<text class="mono" x="${x}" y="${y}" font-size="${SIZE}" font-weight="${weight}" fill="${fill}" textLength="${(text.length * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;

// `Key: ...... value`, the leader filling the line so values align right.
function leader(key, value, t) {
  const k = `${key}:`;
  const dots = Math.max(1, COLS - k.length - value.length - 2);
  return `${mono(k, COL_X, 0, t.accent)}${mono('.'.repeat(dots), COL_X + (k.length + 1) * CHAR, 0, t.faint)}${mono(value, COL_X + (k.length + dots + 2) * CHAR, 0, t.text)}`;
}

// Two `Key: .. value` cells on one line, separated by a bar.
function pair(a, b, t) {
  const half = Math.floor((COLS - 3) / 2);
  const cell = (key, value, x, width) => {
    const k = `${key}:`;
    const dots = Math.max(1, width - k.length - value.length - 2);
    return `${mono(k, x, 0, t.accent)}${mono('.'.repeat(dots), x + (k.length + 1) * CHAR, 0, t.faint)}${mono(value, x + (k.length + dots + 2) * CHAR, 0, t.text)}`;
  };
  return `${cell(a[0], a[1], COL_X, half)}${mono('|', COL_X + (half + 1) * CHAR, 0, t.faint)}${cell(b[0], b[1], COL_X + (half + 3) * CHAR, COLS - half - 3)}`;
}

function section(title, t) {
  const rule = '─'.repeat(Math.max(1, COLS - title.length - 3));
  return `${mono('─', COL_X, 0, t.accent)}${mono(title, COL_X + 2 * CHAR, 0, t.accent, 700)}${mono(rule, COL_X + (title.length + 3) * CHAR, 0, t.cardStroke)}`;
}

export function renderHero({ config, stats, theme: t }) {
  const gh = stats.github;
  const art = (stats.portrait ?? '').split('\n').filter((l, i, a) => l || i < a.length - 1);
  const system = config.system ?? {};

  const identity = [
    ['Role', config.title],
    ['Location', config.location],
    ...Object.entries(system),
  ];
  const contact = (config.badges ?? []).map((b) => [b.label[0].toUpperCase() + b.label.slice(1), b.value]);
  const github = gh
    ? [
        pair(['Repos', `${gh.repos} {Private: ${gh.privateRepos}}`], ['Commits', formatNumber(gh.commitsTotal ?? gh.commits)], t),
        pair(['Contributions', formatNumber(gh.contributionsTotal ?? gh.contributions)], ['This year', formatNumber(gh.contributions)], t),
        pair(['Streak', `${stats.streak.current} days`], ['Longest', `${stats.streak.longest} days`], t),
        pair(['Packages', String(config.packages.length)], ['Installs/month', formatNumber(stats.totals.monthly)], t),
      ]
    : [pair(['Packages', String(config.packages.length)], ['Releases', String(stats.totals.releases)], t)];

  // Right column, one line at a time.
  const lines = [];
  let time = 0.5;
  const push = (markup, gap = 0) => {
    lines.push({ markup, delay: time, gap });
    time += 0.09;
  };
  const header = `${config.login}@github`;
  push(`${mono(header, COL_X, 0, t.accent, 700)}${mono('─'.repeat(Math.max(1, COLS - header.length - 1)), COL_X + (header.length + 1) * CHAR, 0, t.cardStroke)}`, LINE);
  for (const [k, v] of identity) push(leader(k, v, t));
  lines.at(-1).gap = LINE;
  push(section('Contact', t));
  for (const [k, v] of contact) push(leader(k, v, t));
  lines.at(-1).gap = LINE;
  push(section('GitHub Stats', t));
  for (const row of github) push(row);

  let y = PAD + 22;
  const column = lines
    .map((l) => {
      const out = `<g class="out" transform="translate(0 ${y})" style="animation-delay:${l.delay.toFixed(2)}s">${l.markup}</g>`;
      y += LINE + l.gap;
      return out;
    })
    .join('\n    ');
  const colBottom = y - LINE;

  // Left column: the portrait, one row after another.
  const artX = PAD;
  const artW = Math.max(0, ...art.map((l) => l.length)) * ART_CHAR;
  const artLines = art.map(
    (l, i) =>
      l &&
      `<text class="mono art" x="${artX}" y="${PAD + 10 + i * ART_LINE}" font-size="${ART_SIZE}" fill="${t.muted}" xml:space="preserve" textLength="${(l.length * ART_CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs" style="animation-delay:${(0.1 + i * 0.03).toFixed(2)}s">${esc(l)}</text>`,
  );
  const artBottom = PAD + 10 + art.length * ART_LINE;

  const H = Math.ceil(Math.max(colBottom, artBottom) + PAD - 4);
  const cursorY = colBottom + LINE + 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(config.name)}, ${esc(config.title)}, ${esc(config.location)}">
  <title>${esc(config.name)} · ${esc(config.title)}</title>
  <style>
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    .art { opacity: 0; animation: show .01s linear forwards; }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes show { to { opacity: 1; } }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .out, .art { animation: none; opacity: 1; } .cursor { animation: none; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.cardStroke}"/>
    ${artLines.filter(Boolean).join('\n    ')}
    ${column}
    <g class="out" style="animation-delay:${time.toFixed(2)}s"><rect class="cursor" x="${COL_X}" y="${cursorY - SIZE}" width="${CHAR.toFixed(1)}" height="${SIZE + 2}" fill="${t.accent}"/></g>
  </g>
</svg>
`;
}
