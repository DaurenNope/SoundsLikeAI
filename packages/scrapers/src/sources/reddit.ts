import Snoowrap from 'snoowrap';
import type { ScrapeResult } from '../index';
import { initProxyFetch } from '../utils/proxy';

initProxyFetch();

let redditClient: Snoowrap | null = null;

function hasRedditCreds(): boolean {
  return Boolean(
    process.env.REDDIT_CLIENT_ID &&
      process.env.REDDIT_CLIENT_SECRET &&
      process.env.REDDIT_REFRESH_TOKEN
  );
}

function getRedditClient(): Snoowrap {
  if (redditClient) return redditClient;
  redditClient = new Snoowrap({
    userAgent: 'soundslikeai/1.0 (by /u/soundslikeai)',
    clientId: process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    refreshToken: process.env.REDDIT_REFRESH_TOKEN!,
  });
  return redditClient;
}

export async function scrapeReddit(url: string): Promise<ScrapeResult> {
  const postId = extractRedditPostId(url);
  if (!postId) throw new Error(`Cannot extract Reddit post ID from ${url}`);

  if (!hasRedditCreds()) {
    return scrapeRedditPublic(postId, url);
  }

  try {
    const reddit = getRedditClient();
    const post = await reddit.getSubmission(postId).fetch();
    const topComments = await post.comments
      .fetchMore({ amount: 5 })
      .then((comments) =>
        comments
          .filter((c) => (c as any).score > 10)
          .map((c) => (c as any).body)
          .join('\n\n')
      );

    return {
      title: post.title,
      content: `${post.selftext}\n\n--- Top comments ---\n\n${topComments}`.slice(0, 6000),
      url,
      author: post.author.name,
      type: 'reddit',
    };
  } catch (err) {
    return scrapeRedditPublic(postId, url);
  }
}

export async function fetchSubreddit(
  subreddit: string,
  sort: 'hot' | 'top' | 'new' = 'hot',
  limit = 25
) {
  if (!hasRedditCreds()) {
    return fetchSubredditPublic(subreddit, sort, limit);
  }

  try {
    const reddit = getRedditClient();
    const sub = reddit.getSubreddit(subreddit);
    const posts =
      sort === 'top'
        ? await sub.getTop({ time: 'day', limit })
        : sort === 'new'
        ? await sub.getNew({ limit })
        : await sub.getHot({ limit });

    return posts.map((post) => ({
      title: post.title,
      content: post.selftext?.slice(0, 2000) ?? '',
      url: `https://reddit.com${post.permalink}`,
      score: post.score,
      comments: post.num_comments,
      author: post.author.name,
    }));
  } catch (err) {
    return fetchSubredditPublic(subreddit, sort, limit);
  }
}

function extractRedditPostId(url: string): string | null {
  const match = url.match(/comments\/([a-z0-9]+)/);
  return match ? match[1] : null;
}

async function scrapeRedditPublic(
  postId: string,
  url: string
): Promise<ScrapeResult> {
  try {
    const res = await fetch(
      `https://www.reddit.com/comments/${postId}.json?raw_json=1`,
      {
        headers: {
          'User-Agent': 'soundslikeai/1.0',
        },
      }
    );
    if (!res.ok) throw new Error(`Reddit public fetch failed: ${res.status}`);
    const json = await res.json();
    const post = json?.[0]?.data?.children?.[0]?.data;
    const comments = (json?.[1]?.data?.children ?? [])
      .filter((c: any) => c?.kind === 't1' && (c?.data?.score ?? 0) > 10)
      .map((c: any) => c?.data?.body)
      .filter(Boolean)
      .slice(0, 5)
      .join('\n\n');

    return {
      title: post?.title ?? '',
      content: `${post?.selftext ?? ''}\n\n--- Top comments ---\n\n${comments}`.slice(
        0,
        6000
      ),
      url,
      author: post?.author,
      type: 'reddit',
    };
  } catch (err) {
    return fetchPullPushPost(postId, url);
  }
}

async function fetchSubredditPublic(
  subreddit: string,
  sort: 'hot' | 'top' | 'new',
  limit: number
) {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/${sort}.json?raw_json=1&limit=${limit}`,
      {
        headers: { 'User-Agent': 'soundslikeai/1.0' },
      }
    );
    if (!res.ok) throw new Error(`Reddit public fetch failed: ${res.status}`);
    const json = await res.json();
    const posts = json?.data?.children ?? [];
    return posts.map((entry: any) => ({
      title: entry?.data?.title ?? '',
      content: entry?.data?.selftext?.slice(0, 2000) ?? '',
      url: `https://reddit.com${entry?.data?.permalink ?? ''}`,
      score: entry?.data?.score,
      comments: entry?.data?.num_comments,
      author: entry?.data?.author,
    }));
  } catch (err) {
    return fetchPullPushSubreddit(subreddit, limit);
  }
}

async function fetchPullPushPost(postId: string, url: string): Promise<ScrapeResult> {
  const res = await fetch(
    `https://api.pullpush.io/reddit/submission/search/?ids=${postId}`
  );
  if (!res.ok) throw new Error(`PullPush fetch failed: ${res.status}`);
  const json = await res.json();
  const post = json?.data?.[0];
  if (!post) throw new Error('PullPush returned no post');

  let comments = '';
  try {
    const commentsRes = await fetch(
      `https://api.pullpush.io/reddit/comment/search/?link_id=t3_${postId}&size=5&sort_type=score&sort=desc`
    );
    if (commentsRes.ok) {
      const commentsJson = await commentsRes.json();
      comments = (commentsJson?.data ?? [])
        .map((c: any) => c?.body)
        .filter(Boolean)
        .slice(0, 5)
        .join('\n\n');
    }
  } catch {
    // best-effort comments
  }

  return {
    title: post?.title ?? '',
    content: `${post?.selftext ?? ''}\n\n--- Top comments ---\n\n${comments}`.slice(
      0,
      6000
    ),
    url,
    author: post?.author,
    type: 'reddit',
  };
}

async function fetchPullPushSubreddit(subreddit: string, limit: number) {
  const res = await fetch(
    `https://api.pullpush.io/reddit/submission/search/?subreddit=${subreddit}&size=${limit}&sort_type=score&sort=desc`
  );
  if (!res.ok) throw new Error(`PullPush fetch failed: ${res.status}`);
  const json = await res.json();
  const posts = json?.data ?? [];
  return posts.map((entry: any) => ({
    title: entry?.title ?? '',
    content: entry?.selftext?.slice(0, 2000) ?? '',
    url: entry?.full_link ?? entry?.url ?? '',
    score: entry?.score,
    comments: entry?.num_comments,
    author: entry?.author,
  }));
}
