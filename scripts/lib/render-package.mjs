import { esc, formatNumber, relativeTime, wrap } from './util.mjs';
import { fonts } from './theme.mjs';

const W = 440;
const H = 184;

export function renderPackage({ pkg, data, theme, now }) {
  const n = theme.neutral;
  const lines = wrap(pkg.summary, 60, 3);
  const version = data?.version ? `v${data.version}` : 'unreleased';
  const when = data?.releasedAt ? relativeTime(data.releasedAt, now) : null;
  const downloads = data?.downloads ?? null;
  const registry = pkg.registry === 'npm' ? 'npm' : 'Packagist';
  const tagW = Math.round((pkg.language.length + 3 + pkg.tag.length) * 6.6 + 20);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(pkg.name)}: ${esc(pkg.summary)}">
  <title>${esc(pkg.name)} · ${esc(version)}</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .rise { opacity: 0; animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .rise { animation: none; opacity: 1; transform: none; } }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${n.stroke}"/>

    <g class="rise" style="animation-delay:.1s">
      <text class="mono" x="24" y="42" font-size="17" font-weight="700" fill="${n.text}">${esc(pkg.name)}</text>
    </g>
    <g class="rise" style="animation-delay:.2s">
      <rect x="${W - 24 - tagW}" y="26" width="${tagW}" height="22" rx="11" fill="${n.chipBg}" stroke="${n.chipStroke}"/>
      <circle cx="${W - 24 - tagW + 12}" cy="37" r="3.5" fill="${n.faint}"/>
      <text x="${W - 24 - tagW + 21}" y="41" font-size="11" font-weight="600" fill="${n.muted}">${esc(pkg.language)} · ${esc(pkg.tag)}</text>
    </g>

    <g class="rise" style="animation-delay:.3s">
      ${lines.map((line, i) => `<text x="24" y="${72 + i * 19}" font-size="13" fill="${n.muted}">${esc(line)}</text>`).join('\n      ')}
    </g>

    <line x1="24" y1="138" x2="${W - 24}" y2="138" stroke="${n.stroke}"/>

    <g class="rise" style="animation-delay:.45s">
      <circle cx="30" cy="160" r="3.5" fill="${n.faint}"/>
      <text class="mono" x="42" y="164" font-size="12.5" font-weight="700" fill="${n.text}">${esc(version)}</text>
      ${when ? `<text x="${42 + version.length * 7.8 + 8}" y="164" font-size="12" fill="${n.faint}">released ${esc(when)}</text>` : ''}
      <text x="${W - 24}" y="164" text-anchor="end" font-size="12" fill="${n.faint}">${downloads === null ? esc(registry) : `${formatNumber(downloads)} installs${data.period === 'month' ? ' / month' : ''} · ${esc(registry)}`}</text>
    </g>
  </g>
</svg>
`;
}
