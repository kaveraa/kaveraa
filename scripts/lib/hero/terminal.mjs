import { esc, formatNumber } from '../util.mjs';
import { fonts } from '../theme.mjs';
import { systemBlock } from './system.mjs';

// The hero is a terminal session that plays once: each command is typed,
// its output appears, then the prompt waits with a blinking cursor.

const W = 900;
const PAD = 36;
const SIZE = 14;
const CHAR = SIZE * 0.6; // monospace glyph width, forced with textLength
const LINE = 24;
const TYPE_SPEED = 0.045; // seconds per character
const OUT_DELAY = 0.35; // pause before an output line appears

const mono = (text, x, y, fill, extra = '') =>
  `<text class="mono" x="${x}" y="${y}" font-size="${SIZE}" fill="${fill}" textLength="${(text.length * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs" ${extra}>${esc(text)}</text>`;

export function renderHero({ config, stats, theme: t }) {
  const stackLine = Object.values(config.stack ?? {}).flat().slice(0, 8).join('  ');
  const metrics = [
    ['packages', config.packages.length],
    ['releases', stats.totals.releases],
    ['installs/month', stats.totals.monthly],
    [stats.github ? 'contributions' : 'releases/90d', stats.github ? (stats.github.contributionsTotal ?? stats.github.contributions) : stats.releasesLast90],
  ];
  // With the "terminal-system" style, neofetch replaces the three text
  // commands and prints the system card as its output.
  const fusion = config.heroStyle === 'terminal-system';
  const script = fusion
    ? [
        { cmd: 'neofetch', out: [], system: true },
        { cmd: './profile --contributions --weeks 16', out: [], chart: true },
      ]
    : [
        { cmd: 'whoami', out: [`${config.name} · ${config.title.toLowerCase()} · ${config.location}`] },
        { cmd: 'cat stack.txt', out: [stackLine] },
        { cmd: './profile --stats', out: [metrics.map(([k, v]) => `${k} ${formatNumber(v)}`).join('   ')] },
        { cmd: './profile --contributions --weeks 16', out: [], chart: true },
      ];

  let time = 0.4;
  let y = 78;
  const parts = [];
  const styles = [];
  let n = 0;
  for (const step of script) {
    const typed = `$ ${step.cmd}`;
    const width = typed.length * CHAR;
    const dur = step.cmd.length * TYPE_SPEED;
    styles.push(`#c${n} rect { animation: type${n} ${dur.toFixed(2)}s steps(${step.cmd.length}, end) ${time.toFixed(2)}s forwards; }
    @keyframes type${n} { from { width: ${(2 * CHAR).toFixed(1)}px; } to { width: ${width.toFixed(1)}px; } }`);
    parts.push(`
    <clipPath id="c${n}"><rect x="${PAD}" y="${y - SIZE - 2}" width="${(2 * CHAR).toFixed(1)}" height="${SIZE + 8}"/></clipPath>
    <g clip-path="url(#c${n})">
      ${mono('$', PAD, y, t.accent)}
      ${mono(step.cmd, PAD + 2 * CHAR, y, t.text)}
    </g>`);
    time += dur + OUT_DELAY;
    y += LINE;
    for (const line of step.out) {
      parts.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">${mono(line, PAD, y, t.muted)}</g>`);
      y += LINE;
      time += 0.15;
    }
    if (step.system) {
      const block = systemBlock({ config, stats, theme: t, x: PAD, y: y + 2, start: time });
      parts.push(block.markup);
      y += block.height + 10;
      time = block.end;
    }
    if (step.chart) {
      // 16 weekly bars drawn inside the terminal, like a tiny histogram.
      const series = stats.spark ?? [];
      const max = Math.max(1, ...series);
      const barW = 14;
      const gap = 6;
      const chartH = 44;
      const baseY = y + chartH - 6;
      parts.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">
      ${series
        .map((v, i) => {
          const h = Math.max(2, Math.round((v / max) * chartH));
          const x = PAD + i * (barW + gap);
          const last = i === series.length - 1;
          return `<rect x="${x}" y="${baseY - h}" width="${barW}" height="${h}" rx="2" fill="${last ? t.accent : t.chipStroke}" class="bar" style="animation-delay:${(time + i * 0.04).toFixed(2)}s"/>`;
        })
        .join('')}
      ${mono(`${formatNumber(series.reduce((a, b) => a + b, 0))} contributions over 16 weeks`, PAD + series.length * (barW + gap) + 12, baseY - 2, t.faint)}
    </g>`);
      y += chartH + 14;
      time += 0.5;
    }
    n++;
  }
  // Final prompt with a blinking cursor.
  parts.push(`<g class="out" style="animation-delay:${time.toFixed(2)}s">
      ${mono('$', PAD, y, t.accent)}
      <rect class="cursor" x="${PAD + 2 * CHAR}" y="${y - SIZE + 1}" width="${CHAR.toFixed(1)}" height="${SIZE + 3}" fill="${t.accent}"/>
    </g>`);

  const H = y + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(config.name)}, ${esc(config.title)}, ${esc(config.location)}">
  <title>${esc(config.name)} · ${esc(config.title)}</title>
  <style>
    text { font-family: ${fonts.sans}; }
    .mono { font-family: ${fonts.mono}; }
    .out { opacity: 0; animation: show .01s linear forwards; }
    .bar { transform: scaleY(0); transform-box: fill-box; transform-origin: bottom; animation: grow .5s cubic-bezier(.2,.7,.2,1) forwards; }
    .cursor { animation: blink 1s steps(2, start) infinite; }
    @keyframes show { to { opacity: 1; } }
    @keyframes grow { to { transform: scaleY(1); } }
    @keyframes blink { 50% { visibility: hidden; } }
    ${styles.join('\n    ')}
    @media (prefers-reduced-motion: reduce) {
      .out, .bar { animation: none; opacity: 1; transform: none; }
      clipPath rect { animation: none !important; width: ${W}px; }
    }
  </style>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="${t.name === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)'}"/></pattern>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#scan)"/>
    <!-- window chrome -->
    <rect width="${W}" height="40" fill="${t.chipBg}"/>
    <circle cx="22" cy="20" r="5" fill="${t.chipStroke}"/><circle cx="40" cy="20" r="5" fill="${t.chipStroke}"/><circle cx="58" cy="20" r="5" fill="${t.chipStroke}"/>
    <text class="mono" x="${W / 2}" y="24" text-anchor="middle" font-size="12" fill="${t.faint}">${esc(config.login)}@github: ~</text>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.cardStroke}"/>
    ${parts.join('\n')}
  </g>
</svg>
`;
}
