#!/usr/bin/env node
// Builds every SVG under assets/ and refreshes the generated README
// sections. Run locally with `npm run build`; the workflow runs it daily.

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveTag, discoverNpm, discoverPackagist, repoUrl } from './lib/discover.mjs';
import { fetchGitHub, fetchNpm, fetchPackagist } from './lib/fetch.mjs';
import { renderActivity } from './lib/render-activity.mjs';
import { renderBadge } from './lib/render-badge.mjs';
import { renderHero } from './lib/render-hero.mjs';
import { renderPackage } from './lib/render-package.mjs';
import { renderStack } from './lib/render-stack.mjs';
import { themes } from './lib/theme.mjs';
import { dayKey } from './lib/util.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(root, ...p);
const now = new Date();

const config = JSON.parse(await readFile(rel('profile.config.json'), 'utf8'));
const previous = existsSync(rel('data/stats.json')) ? JSON.parse(await readFile(rel('data/stats.json'), 'utf8')) : {};

// 1. Discover every published package, then collect its data. Each source
// falls back to the previous snapshot so a flaky API never breaks the page.
console.log('Discovering packages');
const previousList = (registry) =>
  Object.values(previous.packages ?? {})
    .filter((p) => p.registry === registry)
    .map((p) => ({ registry, id: p.id, name: p.name, description: p.description ?? '', repo: p.repo ?? null }));
const discovered = [
  ...((await discoverPackagist(config.login)) ?? previousList('packagist')),
  ...((await discoverNpm(config.login)) ?? previousList('npm')),
];
const overrides = new Map((config.packageOverrides ?? []).map((o) => [o.name, o]));
console.log(`  ${discovered.length} packages`);

console.log('Fetching package data');
const packages = {};
const pkgList = [];
for (const found of discovered) {
  const override = overrides.get(found.name) ?? {};
  if (override.hidden) continue;
  const fresh = found.registry === 'npm' ? await fetchNpm(found.id) : await fetchPackagist(found.id);
  const last = previous.packages?.[found.name] ?? null;
  // Keep the last known download figures when only that endpoint failed.
  if (fresh && fresh.downloads === null && last?.downloads != null) {
    fresh.downloads = last.downloads;
    fresh.monthly = last.monthly;
    fresh.period = last.period;
  }
  const data = fresh ?? last;
  if (!data) continue;
  const keywords = data.keywords ?? found.keywords ?? [];
  const pkg = {
    name: found.name,
    registry: found.registry,
    id: found.id,
    language: override.language ?? data.language ?? (found.registry === 'npm' ? 'TypeScript' : 'PHP'),
    tag: override.tag ?? deriveTag(found, keywords),
    summary: override.summary ?? data.description ?? found.description ?? '',
    repo: override.repo ?? repoUrl(data.repo) ?? found.repo ?? `https://github.com/${config.login}/${found.name}`,
  };
  packages[found.name] = { ...data, registry: found.registry, id: found.id, name: found.name };
  pkgList.push(pkg);
  console.log(`  ${fresh ? '✓' : '↺'} ${pkg.name} ${data.version ?? '-'}`);
}
// Newest release first, so a fresh package lands on the first page.
pkgList.sort((a, b) => new Date(packages[b.name].releasedAt ?? 0) - new Date(packages[a.name].releasedAt ?? 0));
// Asset ids: the short name, suffixed with the registry on a collision.
const seen = new Map();
for (const pkg of pkgList) {
  pkg.assetId = seen.has(pkg.name) ? `${pkg.name}-${pkg.registry}` : pkg.name;
  seen.set(pkg.name, true);
}
config.packages = pkgList;

console.log('Fetching GitHub data');
const github = (await fetchGitHub(config.login, process.env.GITHUB_TOKEN)) ?? previous.github ?? null;
console.log(`  ${github ? '✓' : '-'} contributions`);

// 2. Derive the numbers the renderers need.
const list = Object.values(packages).filter(Boolean);
const totals = {
  releases: list.reduce((a, p) => a + (p.releases ?? 0), 0),
  monthly: list.some((p) => p.monthly !== null) ? list.reduce((a, p) => a + (p.monthly ?? 0), 0) : null,
};

const releaseDates = config.packages
  .map((pkg) => packages[pkg.name]?.releasedAt)
  .filter(Boolean)
  .map((d) => new Date(d));
const releasesLast90 = releaseDates.filter((d) => now - d < 90 * 86_400_000).length;

// Calendar: 30 weeks ending today, Monday first. Counts come from GitHub
// when available, otherwise from release dates (so the grid is never empty).
const WEEKS = 30;
const counts = new Map(github?.days ?? releaseDates.map((d) => [dayKey(d), 1]));
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const dow = (end.getUTCDay() + 6) % 7; // Monday = 0
const start = new Date(end);
start.setUTCDate(end.getUTCDate() - dow - (WEEKS - 1) * 7);
const weeks = [];
for (let w = 0; w < WEEKS; w++) {
  const week = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + w * 7 + d);
    if (date > end) {
      week.push(null);
      continue;
    }
    const key = dayKey(date);
    week.push({ date: key, count: counts.get(key) ?? 0 });
  }
  weeks.push(week);
}

const spark = weeks.slice(-16).map((week) => week.reduce((a, d) => a + (d?.count ?? 0), 0));

const streak = { current: 0, longest: 0 };
if (github?.days) {
  const sorted = [...github.days].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let run = 0;
  for (const [, count] of sorted) {
    run = count > 0 ? run + 1 : 0;
    streak.longest = Math.max(streak.longest, run);
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i][1] > 0) streak.current++;
    else if (i === sorted.length - 1) continue; // today may not have activity yet
    else break;
  }
}

const stats = { packages, github, totals, releasesLast90, weeks, spark, streak, builtAt: now.toISOString() };

// 3. Render. Every asset is written under a content-hashed file name
// (hero-dark.3f2a1c9e.svg) so GitHub's image proxy and browsers can never
// serve a stale copy: a changed asset is a new path. Stale files are removed.
console.log('Rendering assets');
const assets = new Map(); // base path -> { hashed, content }
const emit = (base, content) => {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
  assets.set(base, { hashed: base.replace(/\.svg$/, `.${hash}.svg`), content });
};
for (const theme of Object.values(themes)) {
  emit(`assets/hero-${theme.name}.svg`, renderHero({ config, stats, theme }));
  emit(`assets/activity-${theme.name}.svg`, renderActivity({ stats, theme }));
  emit(`assets/stack-${theme.name}.svg`, renderStack({ config, theme }));
  for (const badge of config.badges ?? []) {
    emit(`assets/badges/${badge.id}-${theme.name}.svg`, renderBadge({ badge, theme }));
  }
  for (const pkg of config.packages) {
    emit(`assets/packages/${pkg.assetId}-${theme.name}.svg`, renderPackage({ pkg, data: packages[pkg.name], theme, now }));
  }
}
const wanted = new Set([...assets.values()].map((a) => a.hashed));
for (const dir of ['assets', 'assets/packages', 'assets/badges']) {
  await mkdir(rel(dir), { recursive: true });
  for (const file of await readdir(rel(dir))) {
    if (file.endsWith('.svg') && !wanted.has(`${dir}/${file}`)) await unlink(rel(dir, file));
  }
}
for (const { hashed, content } of assets.values()) await writeFile(rel(hashed), content);
// Resolves a README reference (any previous hash or query string) to the
// current hashed path.
const assetRef = (base) => assets.get(base)?.hashed ?? base;
// Never persist per-repository detail: it would publish private repo names.
const { perRepo: _perRepo, ...githubPublic } = github ?? {};
await writeFile(rel('data/stats.json'), JSON.stringify({ packages, github: github ? githubPublic : null, builtAt: stats.builtAt }, null, 2) + '\n');

// 4. Refresh the generated README sections.
const replaceSection = (markdown, name, body) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(markdown)) throw new Error(`README is missing the ${name} markers`);
  return markdown.replace(re, `$1\n${body}\n$2`);
};

const feed = config.packages
  .map((pkg) => ({ pkg, data: packages[pkg.name] }))
  .filter(({ data }) => data?.releasedAt)
  .sort((a, b) => new Date(b.data.releasedAt) - new Date(a.data.releasedAt))
  .slice(0, 5)
  .map(({ pkg, data }) => {
    const date = data.releasedAt.slice(0, 10);
    return `| <sub><code>${date}</code></sub> | [**${pkg.name}**](${pkg.repo}) [\`v${data.version}\`](${data.url}) | ${pkg.summary.split(/[:(]/)[0].trim()} |`;
  });
const feedTable = ['| Released | Package | What shipped |', '| :-- | :-- | :-- |', ...feed].join('\n');

const card = (pkg) =>
  `    <td width="50%"><a href="${pkg.repo}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/packages/${pkg.assetId}-dark.svg"><img src="assets/packages/${pkg.assetId}-light.svg" alt="${pkg.name}: ${pkg.summary.replace(/"/g, '&quot;')}" width="100%"></picture></a></td>`;
const cardTable = (list) => {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(`  <tr>\n${card(list[i])}\n${list[i + 1] ? card(list[i + 1]) : '    <td width="50%"></td>'}\n  </tr>`);
  }
  return `<table>\n${rows.join('\n')}\n</table>`;
};
const perPage = config.packagesPerPage ?? 8;
const pages = [];
for (let i = 0; i < config.packages.length; i += perPage) pages.push(config.packages.slice(i, i + perPage));
const packagesBlock = pages
  .map((list, i) => {
    if (i === 0) return cardTable(list);
    const rest = config.packages.length - i * perPage;
    const label = i === pages.length - 1 ? `${list.length} more package${list.length > 1 ? 's' : ''}` : `${rest} more packages`;
    return `<details>\n  <summary><b>Page ${i + 1}</b> · ${label}</summary>\n\n${cardTable(list)}\n\n</details>`;
  })
  .join('\n\n');

let readme = await readFile(rel('README.md'), 'utf8');
readme = replaceSection(readme, 'shipping-log', feedTable);
readme = replaceSection(readme, 'packages', packagesBlock);

// Point every asset reference in the README at the current hashed file.
readme = readme.replace(/assets\/[\w/-]+?(?:\.[0-9a-f]{8})?\.svg(?:\?v=[0-9a-f]+)?/g, (ref) => {
  const base = ref.replace(/\?.*$/, '').replace(/\.[0-9a-f]{8}\.svg$/, '.svg');
  return assetRef(base);
});
readme = replaceSection(
  readme,
  'built',
  `<sub>Assets regenerated ${now.toISOString().slice(0, 10)} by <a href="https://github.com/${config.login}/${config.login}/actions">a scheduled workflow</a>. No third-party stat cards, everything on this page is rendered from <a href="https://github.com/${config.login}/${config.login}/tree/main/scripts">scripts/</a>.</sub>`,
);
await writeFile(rel('README.md'), readme);
console.log('Done');
