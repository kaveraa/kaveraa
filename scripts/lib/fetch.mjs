// Data sources. Every call degrades gracefully: on failure it returns null
// and the build falls back to the last committed data/stats.json so a flaky
// API never breaks the README.

const UA = 'kaveraa-profile-builder (+https://github.com/kaveraa/kaveraa)';

const getJson = async (url, init = {}) => {
  const res = await fetch(url, {
    ...init,
    headers: { 'user-agent': UA, accept: 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
};

const warn = (what, err) => console.warn(`  ! ${what}: ${err.message ?? err}`);

const isStable = (v) => /^v?\d+\.\d+\.\d+$/.test(v);

export async function fetchPackagist(id) {
  try {
    const { package: pkg } = await getJson(`https://packagist.org/packages/${id}.json`);
    const versions = Object.values(pkg.versions)
      .filter((v) => isStable(v.version))
      .sort((a, b) => new Date(b.time) - new Date(a.time));
    const latest = versions[0];
    return {
      description: pkg.description ?? '',
      keywords: latest?.keywords ?? [],
      repo: pkg.repository ?? null,
      language: pkg.language ?? 'PHP',
      version: latest?.version.replace(/^v/, '') ?? null,
      releasedAt: latest?.time ?? null,
      releases: versions.length,
      downloads: pkg.downloads?.total ?? null,
      period: 'total',
      monthly: pkg.downloads?.monthly ?? null,
      stars: pkg.github_stars ?? null,
      url: `https://packagist.org/packages/${id}`,
    };
  } catch (err) {
    warn(`packagist ${id}`, err);
    return null;
  }
}

export async function fetchNpm(id) {
  try {
    const meta = await getJson(`https://registry.npmjs.org/${id}`);
    const version = meta['dist-tags']?.latest ?? null;
    const releases = Object.keys(meta.versions ?? {}).filter(isStable).length;
    let downloads = null;
    try {
      const d = await getJson(`https://api.npmjs.org/downloads/point/last-month/${id}`);
      downloads = d.downloads ?? null;
    } catch (err) {
      warn(`npm downloads ${id}`, err);
    }
    const latestMeta = version ? meta.versions?.[version] ?? {} : {};
    return {
      description: meta.description ?? '',
      keywords: meta.keywords ?? [],
      repo: meta.repository?.url ?? null,
      language: latestMeta.types || latestMeta.typings ? 'TypeScript' : 'JavaScript',
      version,
      releasedAt: version ? meta.time?.[version] ?? null : null,
      releases,
      downloads,
      period: 'month',
      monthly: downloads,
      stars: null,
      url: `https://www.npmjs.com/package/${id}`,
    };
  } catch (err) {
    warn(`npm ${id}`, err);
    return null;
  }
}

const CONTRIBUTIONS_QUERY = `
  fragment repoFields on Repository {
    nameWithOwner
    isPrivate
    isFork
    stargazerCount
    owner { login }
    languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
      edges { size node { name color } }
    }
  }
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionYears
        totalCommitContributions
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
        nodes { ...repoFields }
      }
      contributed: repositoriesContributedTo(
        first: 100
        includeUserRepositories: true
        contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY]
      ) {
        nodes { ...repoFields }
      }
    }
  }
`;

export async function fetchGitHub(login, token) {
  if (!token) {
    console.warn('  ! GITHUB_TOKEN not set, skipping GitHub data');
    return null;
  }
  try {
    const body = JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables: { login } });
    const { data, errors } = await getJson('https://api.github.com/graphql', {
      method: 'POST',
      body,
      headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
    });
    if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
    const user = data.user;
    const days = user.contributionsCollection.contributionCalendar.weeks.flatMap((w) =>
      w.contributionDays.map((d) => [d.date, d.contributionCount]),
    );
    // Owned repositories plus every repository the user contributed to
    // (private ones included when the token can see them), deduplicated.
    const repos = new Map();
    for (const repo of [...user.repositories.nodes, ...user.contributed.nodes]) {
      if (repo && !repo.isFork) repos.set(repo.nameWithOwner, repo);
    }
    // Each repository weighs the same: its languages are normalised to shares
    // first, then averaged. A single project with huge compiled assets can
    // therefore not dominate the breakdown. Per-repo shares are kept in the
    // snapshot so the aggregation can be tuned without calling the API.
    const perRepo = {};
    let stars = 0;
    let privateRepos = 0;
    for (const repo of repos.values()) {
      if (repo.owner.login.toLowerCase() === login.toLowerCase()) stars += repo.stargazerCount;
      if (repo.isPrivate) privateRepos++;
      const total = repo.languages.edges.reduce((a, e) => a + e.size, 0);
      if (!total) continue;
      perRepo[repo.nameWithOwner] = Object.fromEntries(
        repo.languages.edges.map((e) => [e.node.name, Number((e.size / total).toFixed(4))]),
      );
    }
    const languageBytes = new Map();
    for (const shares of Object.values(perRepo)) {
      for (const [name, share] of Object.entries(shares)) {
        languageBytes.set(name, (languageBytes.get(name) ?? 0) + share);
      }
    }
    // All-time totals: one contributionsCollection per year, in a single request.
    const years = user.contributionsCollection.contributionYears ?? [];
    const yearQuery = `query($login: String!) { user(login: $login) { ${years
      .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { totalCommitContributions contributionCalendar { totalContributions } }`)
      .join(' ')} } }`;
    let commitsTotal = null;
    let contributionsTotal = null;
    if (years.length) {
      try {
        const yearly = await getJson('https://api.github.com/graphql', {
          method: 'POST',
          body: JSON.stringify({ query: yearQuery, variables: { login } }),
          headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
        });
        if (yearly.errors?.length) throw new Error(yearly.errors.map((e) => e.message).join('; '));
        commitsTotal = 0;
        contributionsTotal = 0;
        for (const y of years) {
          commitsTotal += yearly.data.user[`y${y}`].totalCommitContributions;
          contributionsTotal += yearly.data.user[`y${y}`].contributionCalendar.totalContributions;
        }
      } catch (err) {
        warn('github all-time totals', err);
      }
    }
    const totalBytes = [...languageBytes.values()].reduce((a, b) => a + b, 0) || 1;
    const languages = [...languageBytes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, bytes]) => ({ name, share: bytes / totalBytes }));
    return {
      commits: user.contributionsCollection.totalCommitContributions,
      contributions: user.contributionsCollection.contributionCalendar.totalContributions,
      commitsTotal,
      contributionsTotal,
      days,
      languages,
      perRepo,
      stars,
      repos: repos.size,
      privateRepos,
    };
  } catch (err) {
    warn('github graphql', err);
    return null;
  }
}
