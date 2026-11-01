import { esc, formatNumber, relativeTime, wrap } from '../util.mjs';
import { fonts } from '../theme.mjs';

// "json": the package as a small manifest, keys in the accent colour,
// lines revealed one after the other.

const W = 440;
const H = 184;
const SIZE = 12.5;
const CHAR = SIZE * 0.6;
const LINE = 17;

const mono = (text, x, y, fill, weight = 400) =>
  `<text class="mono" x="${x.toFixed(1)}" y="${y}" font-size="${SIZE}" font-weight="${weight}" fill="${fill}" textLength="${(text.length * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;

export function renderPackage({ pkg, data, theme, now }) {
  const n = theme.neutral;
  const t = theme;
  const desc = wrap(pkg.summary, 46, 2);
  // [key, value, colour, extraIndent]; the description string sits on its
  // own lines under its key so it has the full width.
  const rows = [
    ['name', `"${pkg.id}"`, n.text],
    ['version', `"${data?.version ?? 'unreleased'}"`, n.text],
    ['description', '', n.muted],
    ...desc.map((line, i) => [null, `"${line}"${i === desc.length - 1 ? '' : ' +'}`, n.muted, 2]),
    ['released', `"${data?.releasedAt ? relativeTime(data.releasedAt, now) : 'never'}"`, n.text],
    ['installs', data?.downloads != null ? `${formatNumber(data.downloads)}${data.period === 'month' ? ' /month' : ''}` : 'null', t.accent],
  ];
  let y = 32;
  const out = [`<g class="out" style="animation-delay:.1s">${mono('{', 24, y, n.faint)}</g>`];
  y += LINE;
  rows.forEach(([key, value, fill, extra = 0], i) => {
    const indent = 24 + (2 + extra) * CHAR;
    const last = i === rows.length - 1;
    const descLine = !key;
    const parts = key
      ? [mono(`"${key}":`, indent, y, t.accent), value ? mono(`${value}${last ? '' : ','}`, indent + (key.length + 4) * CHAR, y, fill) : '']
      : [mono(`${value}${value.endsWith(' +') ? '' : ','}`, indent, y, fill)];
    out.push(`<g class="out" style="animation-delay:${(0.2 + i * 0.12).toFixed(2)}s">${parts.join('')}</g>`);
    y += LINE;
  });
  out.push(`<g class="out" style="animation-delay:${(0.2 + rows.length * 0.12).toFixed(2)}s">${mono('}', 24, y, n.faint)}</g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(pkg.name)}: ${esc(pkg.summary)}">
  <title>${esc(pkg.name)} · v${esc(data?.version ?? '')}</title>
  <style>
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    @keyframes show { to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .out { animation: none; opacity: 1; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${n.stroke}"/>
    ${out.join('\n    ')}
  </g>
</svg>
`;
}
