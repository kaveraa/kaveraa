import { esc, formatNumber, relativeTime, wrap } from '../util.mjs';
import { fonts } from '../theme.mjs';

// "plain": name, summary, one status line. A thin accent bar on the left is
// the only ornament.

const W = 440;
const H = 184;

export function renderPackage({ pkg, data, theme, now }) {
  const n = theme.neutral;
  const t = theme;
  const lines = wrap(pkg.summary, 58, 3);
  const version = data?.version ? `v${data.version}` : 'unreleased';
  const when = data?.releasedAt ? relativeTime(data.releasedAt, now) : null;
  const installs = data?.downloads != null ? `${formatNumber(data.downloads)} installs${data.period === 'month' ? ' / month' : ''}` : pkg.registry === 'npm' ? 'npm' : 'Packagist';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(pkg.name)}: ${esc(pkg.summary)}">
  <title>${esc(pkg.name)} · ${esc(version)}</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .rise { opacity: 0; animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    .bar { transform: scaleY(0); transform-origin: top; transform-box: fill-box; animation: grow .7s cubic-bezier(.2,.7,.2,1) .1s forwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes grow { to { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .rise, .bar { animation: none; opacity: 1; transform: none; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${n.stroke}"/>
    <rect class="bar" x="0" y="28" width="3" height="${H - 56}" fill="${t.accent}"/>
    <g class="rise" style="animation-delay:.1s">
      <text class="mono" x="28" y="44" font-size="17" font-weight="700" fill="${n.text}">${esc(pkg.name)}</text>
      <text class="mono" x="${W - 24}" y="44" text-anchor="end" font-size="12" fill="${n.faint}">${esc(pkg.registry === 'npm' ? 'npm' : 'packagist')}</text>
    </g>
    <g class="rise" style="animation-delay:.25s">
      ${lines.map((line, i) => `<text x="28" y="${74 + i * 19}" font-size="13" fill="${n.muted}">${esc(line)}</text>`).join('\n      ')}
    </g>
    <g class="rise" style="animation-delay:.4s">
      <text class="mono" x="28" y="160" font-size="12.5" font-weight="700" fill="${n.text}">${esc(version)}</text>
      ${when ? `<text x="${28 + version.length * 7.8 + 8}" y="160" font-size="12" fill="${n.faint}">released ${esc(when)}</text>` : ''}
      <text x="${W - 24}" y="160" text-anchor="end" font-size="12" fill="${n.faint}">${esc(installs)}</text>
    </g>
  </g>
</svg>
`;
}
