export interface Contributor {
  name: string;
  link: string;
  avatar: string;
}

/**
 * Fetches repository contributors from GitHub and returns a simplified list.
 * Falls back to an empty array on failure.
 *
 * Requires GITHUB_TOKEN (optional for public repos, recommended to avoid rate
 * limits). Add it to your environment or Astro `env` file.
 */
export async function getContributors(): Promise<Contributor[]> {
  try {
    const repo = 'sherqo/uni-repo';
    const url = `https://api.github.com/repos/${repo}/contributors`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn('failed to fetch contributors', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    // GitHub contributors endpoint only returns `login`.
    // To show real names we fetch each user's profile.
    const contributors: Contributor[] = [];
    for (const c of data) {
      if (c.type === 'Bot') continue;
      let name = c.login;
      try {
        const userResp = await fetch(c.url, { headers });
        if (userResp.ok) {
          const userInfo = await userResp.json();
          if (userInfo.name) name = userInfo.name;
        }
      } catch {} // ignore individual failures
      contributors.push({
        name,
        link: c.html_url,
        avatar: c.avatar_url,
      });
    }
    return contributors;
  } catch (e) {
    console.error('error fetching contributors', e);
    return [];
  }
}
