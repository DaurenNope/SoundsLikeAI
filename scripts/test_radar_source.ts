import 'dotenv/config';
import {
  fetchRssFeed,
  fetchPodcastFeed,
  fetchYoutubeFeed,
  fetchTwitterFeed,
  fetchSubreddit,
} from '../packages/scrapers/src/index.ts';

const args = process.argv.slice(2);
const source = args[0] || '';

function pick(value: string | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

async function run() {
  if (source === 'rss') {
    const url = pick(args[1], 'https://news.ycombinator.com/rss');
    const items = await fetchRssFeed(url);
    console.log('rss_url', url);
    console.log('count', items.length);
    console.log('sample', items.slice(0, 3));
    return;
  }
  if (source === 'youtube') {
    const url = pick(
      args[1],
      'https://www.youtube.com/feeds/videos.xml?channel_id=UCSHZKyawb77ixDdsGog4iWA'
    );
    const items = await fetchYoutubeFeed(url);
    console.log('youtube_url', url);
    console.log('count', items.length);
    console.log('sample', items.slice(0, 2));
    return;
  }
  if (source === 'podcast') {
    const url = pick(args[1], 'https://lexfridman.com/feed/podcast/');
    const items = await fetchPodcastFeed(url);
    console.log('podcast_url', url);
    console.log('count', items.length);
    console.log('sample', items.slice(0, 2));
    return;
  }
  if (source === 'twitter') {
    const handle = pick(args[1], 'ycombinator');
    const items = await fetchTwitterFeed(handle);
    console.log('twitter_handle', handle);
    console.log('count', items.length);
    console.log('sample', items.slice(0, 2));
    return;
  }
  if (source === 'reddit') {
    const subreddit = pick(args[1], 'startups');
    const items = await fetchSubreddit(subreddit, 'hot', 10);
    console.log('subreddit', subreddit);
    console.log('count', items.length);
    console.log('sample', items.slice(0, 2));
    return;
  }

  console.error('Usage: test_radar_source.ts <rss|youtube|podcast|twitter|reddit> [arg]');
  process.exit(1);
}

run().catch((err) => {
  console.error('error', err?.message || err);
  process.exit(1);
});
