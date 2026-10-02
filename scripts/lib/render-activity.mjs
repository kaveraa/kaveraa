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

const languageBars = (languages, t, x, y, w) => {
  if (!languages?.length) return `<text x="${x}" y="${y + 14}" font-size="12" fill="${t.faint}">Language data appears after the first scheduled build.</text>`;
  return languages
    .map((lang, i) => {
      const ly = y + i * 26;
      const color = languageColors[lang.name] ?? lang.color ?? t.accent;
      const barW = Math.max(6, Math.round(w * lang.share));
      return `
      <g class="rise" style="animation-delay:${(0.3 + i * 0.1).toFixed(2)}s">
        <text x="${x}" y="${ly + 10}" font-size="12" font-weight="600" fill="${t.text}">${esc(lang.name)}</text>
        <text x="${x + w}" y="${ly + 10}" text-anchor="end" font-size="11.5" class="mono" fill="${t.faint}">${(lang.share * 100).toFixed(1)}%</text>
        <rect x="${x}" y="${ly + 15}" width="${w}" height="5" rx="2.5" fill="${t.bar}"/>
        <rect x="${x}" y="${ly + 15}" width="${barW}" height="5" rx="2.5" fill="${color}" class="grow" style="animation-delay:${(0.5 + i * 0.1).toFixed(2)}s"/>
      </g>`;
    })
    .join('');
};

export function renderActivity({ stats, theme: t }) {
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
    <text x="${rightX}" y="36" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.faint}">${gh?.repos ? `LANGUAGES · ${gh.repos} REPOS${gh.privateRepos ? " INCL. PRIVATE" : ""}` : "LANGUAGES"}</text>
    ${languageBars(gh?.languages, t, rightX, 58, rightW)}
  </g>
</svg>
`;
}
