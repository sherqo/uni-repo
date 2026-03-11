export interface Contributor {
  name: string;
  link: string | null;
  avatar?: string;
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

    // `anon=1` includes contributors whose emails are not linked to any GitHub
    // account directly in the /contributors response (type === 'Anonymous').
    const res = await fetch(url + '?anon=1', { headers });
    if (!res.ok) {
      console.warn('failed to fetch contributors', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    // GitHub contributors endpoint only returns `login` for linked accounts and
    // `name`/`email` for anonymous entries.  Fetch each linked user's profile to
    // resolve their display name.
    const contributors: Contributor[] = [];
    // Track both display names and logins to avoid false duplicates when the
    // same person appears under different identifiers across API calls.
    const seenNames = new Set<string>();
    for (const c of data) {
      if (c.type === 'Anonymous') {
        // Anonymous entries have no GitHub profile; use name/email from git metadata.
        const emailPrefix = c.email?.includes('@') ? c.email.split('@')[0] : undefined;
        const name = c.name || emailPrefix;
        if (!name) {
          console.warn('skipping anonymous contributor with no name or email', c);
          continue;
        }
        const nameLower = name.toLowerCase();
        if (seenNames.has(nameLower)) continue;
        seenNames.add(nameLower);
        contributors.push({
          name,
          link: c.email ? `mailto:${c.email}` : null,
        });
        continue;
      }
      let name = c.login; // always falls back to username if no profile name is set
      try {
        const userResp = await fetch(c.url, { headers });
        if (userResp.ok) {
          const userInfo = await userResp.json();
          if (userInfo.name) name = userInfo.name;
        }
      } catch {} // ignore individual failures
      seenNames.add(c.login.toLowerCase());
      seenNames.add(name.toLowerCase());
      contributors.push({
        name,
        link: c.html_url,
        avatar: c.avatar_url,
      });
    }

    // Also scan commits to capture contributors whose commits are not linked to
    // a GitHub account (e.g. because the commit email is unverified/unlinked).
    // For those commits the `author` field returned by the API is null.
    try {
      let page = 1;
      // Cap at 10 pages (up to 1 000 commits) to keep build time reasonable.
      while (page <= 10) {
        const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=100&page=${page}`, { headers });
        if (!commitsRes.ok) break;
        const commits = await commitsRes.json();
        if (!Array.isArray(commits) || commits.length === 0) break;

        for (const commit of commits) {
          // `author` is null when the commit email is not linked to any GitHub account
          if (commit.author) continue;
          const gitAuthor = commit.commit?.author;
          // Use git name when set; fall back to the email prefix so contributors
          // with no git user.name configured are still shown.
          const emailPrefix = gitAuthor?.email?.includes('@') ? gitAuthor.email.split('@')[0] : undefined;
          const name = gitAuthor?.name || emailPrefix;
          if (!name) continue;
          const nameLower = name.toLowerCase();
          if (seenNames.has(nameLower)) continue;
          seenNames.add(nameLower);
          contributors.push({
            name,
            link: gitAuthor?.email ? `mailto:${gitAuthor.email}` : null,
          });
        }

        if (commits.length < 100) break;
        page++;
      }
    } catch (e) {
      console.warn('failed to fetch commits for contributor discovery', e);
    }

    return contributors;
  } catch (e) {
    console.error('error fetching contributors', e);
    return [];
  }
}
