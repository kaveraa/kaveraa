// Finds every package published under the account on Packagist and npm, so a
// new release shows up on the profile without editing the config.

const UA = 'kaveraa-profile-builder (+https://github.com/kaveraa/kaveraa)';

const getJson = async (url) => {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
};

export const repoUrl = (value) => {
  if (!value) return null;
  const url = typeof value === 'string' ? value : value.url;
  if (!url) return null;
  const m = url.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  return m ? `https://github.com/${m[1]}` : url.replace(/^git\+/, '').replace(/\.git$/, '');
};

export async function discoverPackagist(login) {
  try {
    const { packages } = await getJson(`https://packagist.org/users/${login}/packages.json`);
    return packages.map((p) => ({
      registry: 'packagist',
      id: p.name,
      name: p.name.split('/')[1],
      description: p.description ?? '',
      repo: repoUrl(p.repository),
    }));
  } catch (err) {
    console.warn(`  ! packagist discovery: ${err.message}`);
    return null;
  }
}

export async function discoverNpm(login) {
  try {
    const { objects } = await getJson(`https://registry.npmjs.org/-/v1/search?text=maintainer:${login}&size=250`);
    return objects
      .map((o) => o.package)
      .filter((p) => p.maintainers?.some((m) => m.username === login) ?? true)
      .map((p) => ({
        registry: 'npm',
        id: p.name,
        name: p.name.split('/').pop(),
        description: p.description ?? '',
        repo: repoUrl(p.links?.repository),
        keywords: p.keywords ?? [],
      }));
  } catch (err) {
    console.warn(`  ! npm discovery: ${err.message}`);
    return null;
  }
}

// Short "what is it" tag derived from registry keywords, unless overridden.
export const deriveTag = (pkg, keywords = []) => {
  const k = new Set(keywords.map((w) => String(w).toLowerCase()));
  if (pkg.registry === 'packagist') {
    const parts = [];
    if (k.has('laravel')) parts.push('Laravel');
    if (k.has('symfony')) parts.push('Symfony');
    return parts.length ? parts.join(' · ') : 'PHP';
  }
  if (k.has('vue') || k.has('vue3') || k.has('vuejs')) return 'Vue 3';
  if (k.has('react')) return 'React';
  if (k.has('browser')) return 'Browser';
  if (k.has('node') || k.has('nodejs')) return 'Node.js';
  return 'npm';
};
