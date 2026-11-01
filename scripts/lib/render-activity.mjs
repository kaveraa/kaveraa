import { esc, formatNumber } from './util.mjs';
import { fonts, languageColors } from './theme.mjs';

const W = 900;
const H = 262;
const WEEKS = 30;
const CELL = 11;
const GAP = 3;

const level = (count, max) => {
  if (!count) return 0;
  const r = count / max;
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
};

const heatmap = (weeks, t, x, y) => {
  const max = Math.max(1, ...weeks.flat().map((d) => d?.count ?? 0));
  const cells = [];
  weeks.forEach((week, wi) => {
    week.forEach((day, di) => {
      if (!day) return;
      const fill = t.heat[level(day.count, max)];
      cells.push(
        `<rect x="${x + wi * (CELL + GAP)}" y="${y + di * (CELL + GAP)}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}" class="cell" style="animation-delay:${(wi * 0.035 + di * 0.01).toFixed(3)}s"/>`,
      );
    });
  });
  return cells.join('\n      ');
};

const monthLabels = (weeks, t, x, y) => {
  const out = [];
  let last = null;
  weeks.forEach((week, wi) => {
    const first = week.find(Boolean);
    if (!first) return;
    const m = first.date.slice(0, 7);
    if (m !== last) {
      if (last !== null || wi === 0) {
        const label = new Date(first.date).toLocaleString('en', { month: 'short' });
        out.push(`<text x="${x + wi * (CELL + GAP)}" y="${y}" font-size="10" fill="${t.faint}">${label}</text>`);
      }
      last = m;
    }
  });
  return out.join('\n      ');
};

// Up to eight languages, laid out in two columns of four.
const languageBars = (languages, t, x, y, w) => {
  if (!languages?.length) return `<text x="${x}" y="${y + 14}" font-size="12" fill="${t.faint}">Language data appears after the first scheduled build.</text>`;
  const perColumn = 4;
  const gap = 24;
  const columns = languages.length > perColumn ? 2 : 1;
  const colW = (w - gap * (columns - 1)) / columns;
  return languages
    .slice(0, perColumn * 2)
    .map((lang, i) => {
      const col = Math.floor(i / perColumn);
      const row = i % perColumn;
      const lx = x + col * (colW + gap);
      const ly = y + row * 30;
      const cw = colW;
      const color = languageColors[lang.name] ?? lang.color ?? t.accent;
      const barW = Math.max(6, Math.round(cw * lang.share));
      return `
      <g class="rise" style="animation-delay:${(0.3 + i * 0.08).toFixed(2)}s">
        <text x="${lx}" y="${ly + 10}" font-size="12" font-weight="600" fill="${t.text}">${esc(lang.name)}</text>
        <text x="${lx + cw}" y="${ly + 10}" text-anchor="end" font-size="11.5" class="mono" fill="${t.faint}">${(() => { const pct = Math.round(lang.share * 1000) / 10; return Number.isInteger(pct) ? pct : pct.toFixed(1); })()}%</text>
        <rect x="${lx}" y="${ly + 15}" width="${cw}" height="5" rx="2.5" fill="${t.bar}"/>
        <rect x="${lx}" y="${ly + 15}" width="${barW}" height="5" rx="2.5" fill="${color}" class="grow" style="animation-delay:${(0.5 + i * 0.08).toFixed(2)}s"/>
      </g>`;
    })
    .join('');
};

const pct = (share) => {
  const v = Math.round(share * 1000) / 10;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
};

const heatCells = (weeks, t, x, y, cell, gap, delayScale = 0.035) => {
  const max = Math.max(1, ...weeks.flat().map((d) => d?.count ?? 0));
  const out = [];
  weeks.forEach((week, wi) =>
    week.forEach((day, di) => {
      if (!day) return;
      out.push(`<rect x="${x + wi * (cell + gap)}" y="${y + di * (cell + gap)}" width="${cell}" height="${cell}" rx="${Math.max(2, cell / 4)}" fill="${t.heat[level(day.count, max)]}" class="cell" style="animation-delay:${(wi * delayScale + di * 0.01).toFixed(3)}s"/>`);
    }),
  );
  return out.join('\n      ');
};

const frame = (H, fill, stroke, body, css = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Activity">
  <title>Activity</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .cell { opacity: 0; animation: pop .5s cubic-bezier(.2,.7,.2,1) forwards; transform-box: fill-box; transform-origin: center; }
    .rise { opacity: 0; animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    .grow { transform: scaleX(0); transform-origin: 0 0; animation: grow 1s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes pop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes show { to { opacity: 1; } }
    @keyframes grow { to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) { .cell, .rise, .out, .grow { animation: none; opacity: 1; transform: none; } }
    ${css}
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${fill}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${stroke}"/>
    ${body}
  </g>
</svg>
`;

// 1. top: a terminal, numbers as key/value lines, languages as bracket bars.
function renderTop({ stats, theme: t }) {
  const gh = stats.github;
  const SIZE = 13;
  const CHAR = SIZE * 0.6;
  const LINE = 22;
  const mono = (text, x, y, fill, weight = 400) =>
    `<text class="mono" x="${x}" y="${y}" font-size="${SIZE}" font-weight="${weight}" fill="${fill}" textLength="${(text.length * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;
  const cmd = 'top -o activity';
  const kv = gh
    ? [
        ['contributions', `${formatNumber(gh.contributions)} this year · ${formatNumber(gh.contributionsTotal ?? gh.contributions)} all time`],
        ['streak', `${stats.streak.current} days · longest ${stats.streak.longest}`],
        ['repos', `${gh.repos ?? '?'}${gh.privateRepos ? ` · ${gh.privateRepos} private` : ''}`],
      ]
    : [['contributions', 'syncing…']];
  let y = 74;
  let time = 0.8;
  const rows = [];
  for (const [k, v] of kv) {
    rows.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">${mono(k, 40, y, t.accent)}${mono(v, 40 + 15 * CHAR, y, t.text)}</g>`);
    y += LINE;
    time += 0.12;
  }
  y += 8;
  const barLen = 30;
  for (const lang of stats.languages.list.slice(0, 8)) {
    const filled = Math.round(lang.share * barLen);
    rows.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">
      ${mono(lang.name.toLowerCase(), 40, y, t.muted)}
      ${mono('[', 40 + 15 * CHAR, y, t.faint)}${mono('|'.repeat(filled), 40 + 16 * CHAR, y, t.accent)}${mono('|'.repeat(barLen - filled), 40 + (16 + filled) * CHAR, y, t.chipStroke)}${mono(']', 40 + (16 + barLen) * CHAR, y, t.faint)}
      ${mono(pct(lang.share).padStart(6), 40 + (18 + barLen) * CHAR, y, t.text)}
    </g>`);
    y += LINE;
    time += 0.08;
  }
  // 30-week load graph on the right.
  const weeks = stats.weeks;
  const gx = 520;
  const gy = 74;
  const wk = weeks.map((w) => w.reduce((a, d) => a + (d?.count ?? 0), 0));
  const max = Math.max(1, ...wk);
  const barW = 9;
  const gap = 3;
  const gh2 = 60;
  const graph = wk.map((v, i) => {
    const h = Math.max(2, Math.round((v / max) * gh2));
    return `<rect x="${gx + i * (barW + gap)}" y="${gy + gh2 - h}" width="${barW}" height="${h}" rx="2" fill="${i === wk.length - 1 ? t.accent : t.heat[2]}" class="cell" style="animation-delay:${(1 + i * 0.03).toFixed(2)}s"/>`;
  });
  const H = y + 12;
  const body = `
    <clipPath id="c"><rect x="40" y="26" width="0" height="24"><animate attributeName="width" from="${(2 * CHAR).toFixed(1)}" to="${((cmd.length + 2) * CHAR + 4).toFixed(1)}" dur="${(cmd.length * 0.035).toFixed(2)}s" begin="0.2s" fill="freeze"/></rect></clipPath>
    <g clip-path="url(#c)">${mono('$', 40, 44, t.accent, 700)}${mono(cmd, 40 + 2 * CHAR, 44, t.text, 600)}</g>
    ${rows.join('\n    ')}
    <g class="out" style="animation-delay:1s">${mono('load · last 30 weeks', gx, gy + gh2 + 22, t.faint)}</g>
    ${graph.join('')}`;
  return frame(H, t.bg, t.cardStroke, body);
}

// 2. grid: the heatmap as the hero, numbers under it, languages on one line.
function renderGrid({ stats, theme: t }) {
  const gh = stats.github;
  const cell = 20;
  const gap = 5;
  const weeks = stats.weeks;
  const gridW = weeks.length * (cell + gap) - gap;
  const x = Math.round((W - gridW) / 2);
  const y = 40;
  const numbers = gh
    ? [
        [formatNumber(gh.contributions), 'contributions · 1 year'],
        [formatNumber(gh.contributionsTotal ?? gh.contributions), 'all time'],
        [stats.streak.current, 'day streak'],
        [stats.streak.longest, 'longest streak'],
      ]
    : [[stats.totals.releases, 'releases'], [formatNumber(stats.totals.monthly), 'installs / month']];
  const ny = y + 7 * (cell + gap) + 44;
  const nums = numbers
    .map(([v, l], i) => `<g class="rise" style="animation-delay:${(0.9 + i * 0.08).toFixed(2)}s"><text x="${x + (i * gridW) / numbers.length}" y="${ny}" font-size="24" font-weight="800" letter-spacing="-.5" fill="${t.text}">${v}</text><text x="${x + (i * gridW) / numbers.length}" y="${ny + 18}" font-size="10.5" font-weight="600" letter-spacing=".3" fill="${t.faint}">${esc(String(l).toUpperCase())}</text></g>`)
    .join('');
  const langs = stats.languages.list.slice(0, 8).map((l) => `${l.name} ${pct(l.share)}`).join('   ·   ');
  const H = ny + 62;
  const body = `
    ${heatCells(weeks, t, x, y, cell, gap)}
    ${nums}
    <line x1="${x}" y1="${ny + 32}" x2="${x + gridW}" y2="${ny + 32}" stroke="${t.cardStroke}"/>
    <text class="mono rise" x="${x}" y="${ny + 52}" font-size="12" fill="${t.muted}" style="animation-delay:1.3s">${esc(langs)}</text>`;
  return frame(H, t.card, t.cardStroke, body);
}

// 3. tiles: four stat tiles, then languages as full-width bars. No heatmap.
function renderTiles({ stats, theme: t }) {
  const gh = stats.github;
  const tiles = gh
    ? [
        [formatNumber(gh.contributions), 'contributions · 1 year'],
        [formatNumber(gh.contributionsTotal ?? gh.contributions), 'contributions · all time'],
        [stats.streak.current, 'current streak · days'],
        [stats.streak.longest, 'longest streak · days'],
      ]
    : [[stats.totals.releases, 'releases'], [formatNumber(stats.totals.monthly), 'installs / month'], [stats.releasesLast90, 'releases · 90 days']];
  const PAD = 32;
  const gap = 14;
  const tw = (W - PAD * 2 - gap * (tiles.length - 1)) / tiles.length;
  const th = 84;
  const tileSvg = tiles
    .map(([v, l], i) => {
      const x = PAD + i * (tw + gap);
      return `<g class="rise" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s">
      <rect x="${x.toFixed(1)}" y="${PAD}" width="${tw.toFixed(1)}" height="${th}" rx="14" fill="${t.chipBg}" stroke="${t.chipStroke}"/>
      <text x="${(x + 18).toFixed(1)}" y="${PAD + 42}" font-size="26" font-weight="800" letter-spacing="-.5" fill="${t.text}">${v}</text>
      <text x="${(x + 18).toFixed(1)}" y="${PAD + 64}" font-size="10.5" font-weight="600" letter-spacing=".3" fill="${t.faint}">${esc(String(l).toUpperCase())}</text>
    </g>`;
    })
    .join('');
  const langs = stats.languages.list.slice(0, 8);
  const ly = PAD + th + 40;
  const rowH = 30;
  const cols = 2;
  const colGap = 36;
  const colW = (W - PAD * 2 - colGap) / cols;
  const bars = langs
    .map((lang, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = PAD + col * (colW + colGap);
      const y = ly + row * rowH;
      const color = languageColors[lang.name] ?? lang.color ?? t.accent;
      return `<g class="rise" style="animation-delay:${(0.5 + i * 0.07).toFixed(2)}s">
      <text x="${x}" y="${y}" font-size="12" font-weight="600" fill="${t.text}">${esc(lang.name)}</text>
      <text x="${x + colW}" y="${y}" text-anchor="end" font-size="11.5" class="mono" fill="${t.faint}">${pct(lang.share)}</text>
      <rect x="${x}" y="${y + 6}" width="${colW}" height="4" rx="2" fill="${t.bar}"/>
      <rect x="${x}" y="${y + 6}" width="${Math.max(4, Math.round(colW * lang.share))}" height="4" rx="2" fill="${color}" class="grow" style="animation-delay:${(0.6 + i * 0.07).toFixed(2)}s"/>
    </g>`;
    })
    .join('');
  const H = ly + Math.ceil(langs.length / cols) * rowH + 12;
  return frame(H, t.card, t.cardStroke, `${tileSvg}${bars}`);
}

export function renderActivity(input) {
  const style = input.stats.activityStyle;
  if (style === 'top') return renderTop(input);
  if (style === 'grid') return renderGrid(input);
  if (style === 'tiles') return renderTiles(input);
  return renderPanel(input);
}

function renderPanel({ stats, theme: t }) {
  const gh = stats.github;
  const weeks = stats.weeks;
  const gridX = 40;
  const gridY = 66;
  const gridW = WEEKS * (CELL + GAP) - GAP;
  const rightX = gridX + gridW + 56;
  const rightW = W - rightX - 40;

  const summary = gh
    ? [
        { value: gh.contributions, label: 'contributions · 1 year' },
        { value: gh.contributionsTotal ?? gh.commitsTotal, label: 'contributions · all time' },
        { value: stats.streak.current, label: 'current streak · days' },
        { value: stats.streak.longest, label: 'longest streak · days' },
      ].filter((m) => m.value != null)
    : [
        { value: stats.totals.releases, label: 'releases shipped' },
        { value: stats.totals.monthly, label: 'installs / month' },
        { value: stats.releasesLast90, label: 'releases · 90 days' },
      ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Activity over the last ${WEEKS} weeks">
  <title>Activity</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .cell { opacity: 0; animation: pop .5s cubic-bezier(.2,.7,.2,1) forwards; transform-box: fill-box; transform-origin: center; }
    .rise { opacity: 0; animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    .grow { transform: scaleX(0); transform-origin: 0 0; animation: grow 1s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes pop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes grow { to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) { .cell, .rise, .grow { animation: none; opacity: 1; transform: none; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.cardStroke}"/>

    <text x="${gridX}" y="36" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}">${gh ? 'CONTRIBUTIONS' : 'RELEASE ACTIVITY'} · LAST ${WEEKS} WEEKS</text>
    ${monthLabels(weeks, t, gridX, 54)}
    ${heatmap(weeks, t, gridX, gridY)}

    ${['Mon', 'Wed', 'Fri']
      .map((d, i) => `<text x="${gridX - 8}" y="${gridY + i * 2 * (CELL + GAP) + 9}" text-anchor="end" font-size="9" fill="${t.faint}">${d}</text>`)
      .join('\n    ')}

    <g class="rise" style="animation-delay:.2s">
      ${summary
        .map((m, i) => {
          // One row across the whole panel, under both columns.
          const mx = gridX + i * ((W - 2 * gridX) / summary.length);
          return `<text x="${mx}" y="${H - 38}" font-size="22" font-weight="800" letter-spacing="-.5" fill="${t.text}">${formatNumber(m.value)}</text>
      <text x="${mx}" y="${H - 22}" font-size="10" font-weight="600" letter-spacing=".3" fill="${t.faint}">${esc(m.label.toUpperCase())}</text>`;
        })
        .join('\n      ')}
    </g>

    <line x1="${rightX - 28}" y1="30" x2="${rightX - 28}" y2="${gridY + 7 * (CELL + GAP) + 6}" stroke="${t.cardStroke}"/>
    <line x1="${gridX}" y1="${H - 68}" x2="${W - gridX}" y2="${H - 68}" stroke="${t.cardStroke}"/>
    <text x="${rightX}" y="36" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}">${
      stats.languages.curated
        ? 'LANGUAGES · PROFICIENCY'
        : gh?.repos
          ? `LANGUAGES · ${gh.repos} REPOS${gh.privateRepos ? ' INCL. PRIVATE' : ''}`
          : 'LANGUAGES'
    }</text>
    ${languageBars(stats.languages.list, t, rightX, 58, rightW)}
  </g>
</svg>
`;
}
