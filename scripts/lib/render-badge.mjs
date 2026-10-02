import { esc } from './util.mjs';
import { fonts } from './theme.mjs';

// One shields.io-style badge per link, so the README can wrap each in <a>.
export function renderBadge({ badge, theme: t }) {
  const h = 24;
  const size = 11;
  const lw = Math.round(badge.label.length * size * 0.62 + 20);
  const vw = Math.round(badge.value.length * size * 0.58 + 20);
  const w = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(badge.label)}: ${esc(badge.value)}">
  <title>${esc(badge.label)}: ${esc(badge.value)}</title>
  <style>text { font-family: ${fonts.sans}; }</style>
  <clipPath id="r"><rect width="${w}" height="${h}" rx="6"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="${h}" fill="${t.accent}"/>
    <rect x="${lw}" width="${vw}" height="${h}" fill="${t.name === 'dark' ? '#1c1c1f' : '#f1f1f3'}"/>
  </g>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="none" stroke="${t.chipStroke}"/>
  <text x="${lw / 2}" y="16" text-anchor="middle" font-size="${size}" font-weight="700" letter-spacing=".2" fill="#ffffff">${esc(badge.label.toUpperCase())}</text>
  <text x="${lw + vw / 2}" y="16" text-anchor="middle" font-size="${size}" font-weight="600" fill="${t.text}">${esc(badge.value)}</text>
</svg>
`;
}
