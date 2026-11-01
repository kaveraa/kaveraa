import { esc, formatNumber, relativeTime, wrap } from '../util.mjs';
import { fonts } from '../theme.mjs';

// "shell": the install command is typed on the first line, then the
// summary and a one-line status appear. Monospace, no chrome.

const W = 440;
const H = 184;
const SIZE = 13;
const CHAR = SIZE * 0.6;

const mono = (text, x, y, fill, weight = 400, size = SIZE) =>
  `<text class="mono" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" textLength="${(text.length * size * 0.6).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;

export function renderPackage({ pkg, data, theme, now }) {
  const n = theme.neutral;
  const t = theme;
  const cmd = pkg.registry === 'npm' ? `npm i ${pkg.id}` : `composer require ${pkg.id}`;
  const dur = (cmd.length * 0.03).toFixed(2);
  const lines = wrap(pkg.summary, 54, 3);
  const version = data?.version ? `v${data.version}` : 'unreleased';
  const when = data?.releasedAt ? relativeTime(data.releasedAt, now) : null;
  const status = [version, when ? `released ${when}` : null, data?.downloads != null ? `${formatNumber(data.downloads)} installs${data.period === 'month' ? '/month' : ''}` : null]
    .filter(Boolean)
    .join(' · ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(pkg.name)}: ${esc(pkg.summary)}">
  <title>${esc(pkg.name)} · ${esc(version)}</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    #c rect { animation: type ${dur}s steps(${cmd.length}, end) .2s forwards; }
    @keyframes type { from { width: ${(2 * CHAR).toFixed(1)}px; } to { width: ${((cmd.length + 2) * CHAR).toFixed(1)}px; } }
    .out { opacity: 0; animation: show .01s linear forwards; }
    @keyframes show { to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .out { animation: none; opacity: 1; } #c rect { animation: none; width: ${W}px; } }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>
    <clipPath id="c"><rect x="24" y="30" width="${(2 * CHAR).toFixed(1)}" height="22"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${n.stroke}"/>
    <g clip-path="url(#c)">
      ${mono('$', 24, 46, t.accent, 700)}
      ${mono(cmd, 24 + 2 * CHAR, 46, n.text, 600)}
    </g>
    <g class="out" style="animation-delay:${(Number(dur) + 0.5).toFixed(2)}s">
      ${lines.map((line, i) => `<text x="24" y="${78 + i * 19}" font-size="13" fill="${n.muted}">${esc(line)}</text>`).join('\n      ')}
    </g>
    <g class="out" style="animation-delay:${(Number(dur) + 0.8).toFixed(2)}s">
      <line x1="24" y1="140" x2="${W - 24}" y2="140" stroke="${n.stroke}"/>
      ${mono(status, 24, 164, n.faint, 400, 12)}
    </g>
  </g>
</svg>
`;
}
