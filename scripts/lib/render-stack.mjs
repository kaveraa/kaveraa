import { esc } from './util.mjs';
import { fonts } from './theme.mjs';

const W = 900;
const LABEL_W = 170;
const ROW_H = 34;
const PAD = 28;

// 1. tree: the output of `tree stack`, one line per technology.
function renderTree({ config, theme }) {
  const n = theme.neutral;
  const t = theme;
  const SIZE = 13;
  const CHAR = SIZE * 0.6;
  const LINE = 21;
  const mono = (text, x, y, fill, weight = 400) =>
    `<text class="mono" x="${x}" y="${y}" font-size="${SIZE}" font-weight="${weight}" fill="${fill}" textLength="${(text.length * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;
  const groups = Object.entries(config.stack);
  const plain = (text, x, y, fill) => `<text class="mono" x="${x}" y="${y}" font-size="${SIZE}" fill="${fill}">${esc(text)}</text>`;
  const rows = [];
  let y = 96;
  let time = 0.9;
  groups.forEach(([label, items], gi) => {
    const lastGroup = gi === groups.length - 1;
    rows.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">${plain(lastGroup ? '└──' : '├──', PAD, y, n.faint)}${mono(label.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-'), PAD + 4 * CHAR, y, t.accent, 700)}</g>`);
    y += LINE;
    time += 0.1;
    // Technologies on one indented line, wrapped if needed.
    const prefix = lastGroup ? '    ' : '│   ';
    const chunks = [];
    let line = [];
    for (const item of items) {
      if ([...line, item].join('  ').length > 72) {
        chunks.push(line);
        line = [];
      }
      line.push(item);
    }
    if (line.length) chunks.push(line);
    chunks.forEach((chunk, ci) => {
      const branch = ci === chunks.length - 1 ? '└── ' : '├── ';
      rows.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">${plain(prefix.trimEnd(), PAD, y, n.faint)}${plain(branch.trimEnd(), PAD + 4 * CHAR, y, n.faint)}${mono(chunk.join('  '), PAD + 8 * CHAR, y, n.text)}</g>`);
      y += LINE;
      time += 0.08;
    });
  });
  const H = y + 10;
  const cmd = 'tree stack';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack">
  <title>Stack</title>
  <style>
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    @keyframes show { to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .out { animation: none; opacity: 1; } #c rect { animation: none; width: ${W}px; } }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <clipPath id="c"><rect x="${PAD}" y="26" width="0" height="24"><animate attributeName="width" from="${(2 * CHAR).toFixed(1)}" to="${((cmd.length + 2) * CHAR + 4).toFixed(1)}" dur="${(cmd.length * 0.04).toFixed(2)}s" begin="0.2s" fill="freeze"/></rect></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${n.stroke}"/>
    <g clip-path="url(#c)">${mono('$', PAD, 44, t.accent, 700)}${mono(cmd, PAD + 2 * CHAR, 44, n.text, 600)}</g>
    <g class="out" style="animation-delay:.8s">${mono('stack', PAD, 74, n.muted)}</g>
    ${rows.join('\n    ')}
  </g>
</svg>
`;
}

// 2. lines: typographic rows, category label on the left, technologies as
// plain text separated by dots, thin dividers.
function renderLines({ config, theme }) {
  const n = theme.neutral;
  const groups = Object.entries(config.stack);
  const ROW = 44;
  const H = PAD + groups.length * ROW + PAD - 12;
  const rows = groups.map(([label, items], i) => {
    const y = PAD + 20 + i * ROW;
    return `
    <g class="rise" style="animation-delay:${(0.1 + i * 0.1).toFixed(2)}s">
      <text x="${PAD}" y="${y}" font-size="11" font-weight="700" letter-spacing=".5" fill="${n.faint}">${esc(label.toUpperCase())}</text>
      <text x="${PAD + LABEL_W}" y="${y}" font-size="14" font-weight="500" fill="${n.text}">${esc(items.join('   ·   '))}</text>
      ${i < groups.length - 1 ? `<line x1="${PAD}" y1="${y + 16}" x2="${W - PAD}" y2="${y + 16}" stroke="${n.stroke}"/>` : ''}
    </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack">
  <title>Stack</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .rise { opacity: 0; animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .rise { animation: none; opacity: 1; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${n.stroke}"/>
    ${rows.join('')}
  </g>
</svg>
`;
}

// 3. tags: monospace, lowercase, bracketed tags after a red category key.
function renderTags({ config, theme }) {
  const n = theme.neutral;
  const t = theme;
  const SIZE = 13;
  const CHAR = SIZE * 0.6;
  const LINE = 30;
  const groups = Object.entries(config.stack);
  const H = PAD + groups.length * LINE + PAD - 10;
  const rows = groups.map(([label, items], gi) => {
    const y = PAD + 16 + gi * LINE;
    const key = label.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
    let x = PAD + LABEL_W;
    const tags = items.map((item, i) => {
      const text = `[${item.toLowerCase()}]`;
      const w = text.length * CHAR;
      const tag = `<text class="mono out" x="${x.toFixed(1)}" y="${y}" font-size="${SIZE}" fill="${n.text}" style="animation-delay:${(0.2 + gi * 0.15 + i * 0.05).toFixed(2)}s" textLength="${w.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;
      x += w + CHAR * 1.5;
      return tag;
    });
    return `
    <text class="mono out" x="${PAD}" y="${y}" font-size="${SIZE}" font-weight="700" fill="${t.accent}" style="animation-delay:${(0.1 + gi * 0.15).toFixed(2)}s">${esc(key)}:</text>
    ${tags.join('')}`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack">
  <title>Stack</title>
  <style>
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    @keyframes show { to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .out { animation: none; opacity: 1; } }
  </style>
  <defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${n.card}"/>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${n.stroke}"/>
    ${rows.join('')}
  </g>
</svg>
`;
}

export function renderStack(input) {
  const style = input.config.stackStyle;
  if (style === 'tree') return renderTree(input);
  if (style === 'lines') return renderLines(input);
  if (style === 'tags') return renderTags(input);
  return renderChips(input);
}

function renderChips({ config, theme }) {
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
