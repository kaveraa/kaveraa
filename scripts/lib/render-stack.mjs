import { esc } from './util.mjs';
import { fonts } from './theme.mjs';

const W = 900;
const LABEL_W = 170;
const ROW_H = 34;
const PAD = 28;

export function renderStack({ config, theme }) {
  const n = theme.neutral;
  const groups = Object.entries(config.stack);
  const rows = [];
  let y = PAD + 18;
  let index = 0;
  groups.forEach(([label, items], gi) => {
    const maxX = W - PAD;
    let cx = PAD + LABEL_W;
    let cy = y;
    const chips = [];
    items.forEach((item) => {
      const w = Math.round(item.length * 7.1 + 22);
      if (cx + w > maxX) {
        cx = PAD + LABEL_W;
        cy += ROW_H;
      }
      chips.push(`
    <g class="rise" style="animation-delay:${(0.1 + index * 0.04).toFixed(2)}s">
      <rect x="${cx}" y="${cy - 18}" width="${w}" height="26" rx="13" fill="${n.chipBg}" stroke="${n.chipStroke}"/>
      <text x="${cx + w / 2}" y="${cy - 1}" text-anchor="middle" font-size="12" font-weight="600" fill="${n.text}">${esc(item)}</text>
    </g>`);
      cx += w + 8;
      index++;
    });
    rows.push(`
    <text class="rise" style="animation-delay:${(0.05 + gi * 0.08).toFixed(2)}s" x="${PAD}" y="${y - 1}" font-size="11" font-weight="700" letter-spacing=".5" fill="${n.faint}">${esc(label.toUpperCase())}</text>
    ${chips.join('')}`);
    y = cy + ROW_H + 12;
    if (gi < groups.length - 1) {
      rows.push(`<line x1="${PAD}" y1="${y - ROW_H + 2}" x2="${W - PAD}" y2="${y - ROW_H + 2}" stroke="${n.stroke}"/>`);
    }
  });
  const H = y - ROW_H + PAD - 6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack">
  <title>Stack</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .rise { opacity: 0; animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .rise { animation: none; opacity: 1; } }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${n.stroke}"/>
    ${rows.join('')}
  </g>
</svg>
`;
}
