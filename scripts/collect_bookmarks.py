#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None
from pathlib import Path


def add_beyondlines_path() -> Path:
    repo_path = os.getenv("BEYONDLINES_MVP_PATH")
    if not repo_path:
        repo_path = "/Users/mac/Documents/Development/beyondlines/beyondlines_mvp"
    root = Path(repo_path).resolve()
    if not root.exists():
        raise RuntimeError(f"Beyondlines MVP path not found: {root}")
    sys.path.insert(0, str(root))
    return root


def load_env_files(root: Path) -> None:
    if not load_dotenv:
        return
    # Load local repo env first, then Beyondlines env (if any)
    load_dotenv(Path.cwd() / ".env", override=False)
    load_dotenv(root / ".env", override=False)


def env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value


# Redirect noisy stdout from dependencies to stderr; we'll emit JSON on the real stdout.
sys.stdout = sys.stderr


def normalize_post(post, platform: str) -> dict:
    # Support both dicts and SocialPost objects
    def _normalize_dt(value):
        try:
            if hasattr(value, "isoformat"):
                return value.isoformat()
        except Exception:
            pass
        return value

    if isinstance(post, dict):
        return {
            "platform": platform,
            "post_id": post.get("post_id") or post.get("id"),
            "title": post.get("title") or "",
            "content": post.get("content") or "",
            "url": post.get("url"),
            "author": post.get("author"),
            "created_at": _normalize_dt(post.get("created_at")),
        }
    return {
        "platform": platform,
        "post_id": getattr(post, "post_id", None) or getattr(post, "id", None),
        "title": getattr(post, "title", "") or "",
        "content": getattr(post, "content", "") or "",
        "url": getattr(post, "url", None),
        "author": getattr(post, "author", None),
        "created_at": _normalize_dt(getattr(post, "created_at", None)),
    }


async def collect_twitter(limit: int, stop_at: str | None) -> list[dict]:
    from app.domain.collection.extractors.twitter_extractor_playwright import (
        TwitterExtractorPlaywright,
    )

    username = env("TWITTER_USERNAME")
    password = env("TWITTER_PASSWORD")
    cookie_file = (
        env("TWITTER_COOKIE_FILE")
        or env("TWITTER_COOKIES_FILE")
        or env("TWITTER_COOKIES_PATH")
    )
    if not username:
        raise RuntimeError("TWITTER_USERNAME is required")

    headless = env("HEADLESS_MODE", "true").lower() in ("1", "true", "yes")
    extractor = TwitterExtractorPlaywright(
        username=username,
        password=password,
        headless=headless,
        cookie_file=cookie_file,
    )
    ok = await extractor.authenticate()
    if not ok:
        await extractor.close()
        raise RuntimeError("Twitter authentication failed")

    posts = await extractor.get_saved_posts_api_first(
        limit=limit, stop_at_post_id=stop_at
    )
    await extractor.close()
    return [normalize_post(p, "twitter") for p in posts]


async def collect_threads(limit: int, stop_at: str | None) -> list[dict]:
    from app.domain.collection.extractors.threads_extractor import ThreadsExtractor

    username = env("THREADS_USERNAME")
    password = env("THREADS_PASSWORD")
    cookies_path = (
        env("THREADS_COOKIE_FILE")
        or env("THREADS_COOKIES_FILE")
        or env("THREADS_COOKIES_PATH")
        or "cookies/collection/threads_cookies.json"
    )
    if not username:
        raise RuntimeError("THREADS_USERNAME is required")

    extractor = ThreadsExtractor()
    posts = await extractor.get_saved_posts(
        username=username,
        password=password,
        limit=limit,
        cookies_path=cookies_path,
        stop_at_post_id=stop_at,
    )
    return [normalize_post(p, "threads") for p in posts]


def collect_reddit(limit: int) -> list[dict]:
    from app.domain.collection.extractors.reddit_extractor import RedditExtractor

    client_id = env("REDDIT_CLIENT_ID")
    client_secret = env("REDDIT_CLIENT_SECRET")
    user_agent = env("REDDIT_USER_AGENT", "SoundsLikeAI/1.0")
    username = env("REDDIT_USERNAME")
    password = env("REDDIT_PASSWORD")
    access_token = env("REDDIT_ACCESS_TOKEN")
    if not client_id or not client_secret:
        raise RuntimeError("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are required")

    extractor = RedditExtractor(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent,
        username=username,
        password=password,
        access_token=access_token,
    )
    posts = extractor.get_saved_posts(existing_ids=set(), limit=limit)
    if isinstance(posts, tuple):
        posts = posts[0]
    return [normalize_post(p, "reddit") for p in posts]


async def main() -> None:
    root = add_beyondlines_path()
    load_env_files(root)

    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", choices=["twitter", "threads", "reddit", "all"], default="all")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--stop-at", dest="stop_at", default=None)
    args = parser.parse_args()

    results: list[dict] = []

    if args.platform in ("all", "twitter"):
        results.extend(await collect_twitter(args.limit, args.stop_at))
    if args.platform in ("all", "threads"):
        results.extend(await collect_threads(args.limit, args.stop_at))
    if args.platform in ("all", "reddit"):
        results.extend(collect_reddit(args.limit))

    print(json.dumps(results), file=sys.__stdout__)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
