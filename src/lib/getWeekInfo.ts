/** Saturday, 7 Feb 2026 — the start of academic Week 1 (UTC midnight). */
const WEEK_1_START = new Date('2026-02-07T00:00:00.000Z');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function getCurrentWeek(): number {
  const diffMs = Date.now() - WEEK_1_START.getTime();
  if (diffMs < 0) return 1;
  return Math.floor(diffMs / MS_PER_WEEK) + 1;
}

export interface CommitInfo {
  date: string;
  author: string;
  avatar: string;
  profile: string;
}

export async function getLastCommitInfo(): Promise<CommitInfo> {
  try {
    const repo = 'sherqo/uni-repo';
    const url = `https://api.github.com/repos/${repo}/commits?per_page=1`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'uni-repo/1.0',
    };
    const fromProcess = typeof process !== 'undefined' ? process.env?.GITHUB_TOKEN : undefined;
    const token = fromProcess;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn('failed to fetch last commit info', res.status, await res.text());
      return { date: 'unknown', author: 'unknown', avatar: '', profile: '' };
    }

    const data = await res.json();
    const commit = Array.isArray(data) && data[0];
    if (!commit) {
      return { date: 'unknown', author: 'unknown', avatar: '', profile: '' };
    }

    const dateRaw = commit.commit?.author?.date;
    const date = dateRaw ? new Date(dateRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown';

    let author = 'unknown';
    let avatar = '';
    let profile = '';

    if (commit.author) {
      author = commit.author.login || commit.commit?.author?.name || 'unknown';
      avatar = commit.author.avatar_url || '';
      profile = commit.html_url || '';
    } else if (commit.commit?.author) {
      author = commit.commit.author.name || 'unknown';
    }

    return { date, author, avatar, profile };
  } catch (e) {
    console.error('error fetching last commit info', e);
    return { date: 'unknown', author: 'unknown', avatar: '', profile: '' };
  }
}
