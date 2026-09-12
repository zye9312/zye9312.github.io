#!/usr/bin/env python3

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


PROJECT_PATH = Path(__file__).resolve().parent
VIDEOS_PATH = PROJECT_PATH / "videos"
SOURCE_PATTERN = re.compile(r"var\s+sources\s*=\s*(\[.*?\]);", re.DOTALL)

REQUIRED_ASSETS = (
    "../assets/player/video.css?v=6",
    "../assets/player/player.js?v=12",
)
NATIVE_VIDEO_TAG = '<video id="my-video" controls playsinline preload="auto">'
PLAYER_TOOLBAR = '<div id="player-toolbar" class="episode-toolbar">'


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


def validate_video_page(path: Path):
    errors = []
    content = path.read_text(encoding="utf-8")

    source_match = SOURCE_PATTERN.search(content)
    if not source_match:
        return [f"{path.name}: sources array not found"], 0

    try:
        sources = json.loads(source_match.group(1))
    except json.JSONDecodeError as error:
        return [f"{path.name}: sources is not valid JSON ({error})"], 0

    if not sources:
        errors.append(f"{path.name}: sources is empty")

    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            errors.append(f"{path.name}: episode {index + 1} is not an object")
            continue
        title = source.get("title")
        url = source.get("src")
        if not isinstance(title, str) or not title.strip():
            errors.append(f"{path.name}: episode {index + 1} has no title")
        parsed = urlparse(url) if isinstance(url, str) else None
        if not parsed or parsed.scheme not in {"http", "https"} or not parsed.netloc:
            errors.append(f"{path.name}: episode {index + 1} has an invalid URL")

    for asset in REQUIRED_ASSETS:
        if asset not in content:
            errors.append(f"{path.name}: missing pinned asset {asset}")
    if NATIVE_VIDEO_TAG not in content:
        errors.append(f"{path.name}: missing native preloading video element")
    if PLAYER_TOOLBAR not in content:
        errors.append(f"{path.name}: missing player toolbar")
    if (
        "videojs" in content
        or "video-js" in content
        or "cookie.js" in content
        or "hls.js" in content
        or "/latest/" in content
        or "@latest" in content
    ):
        errors.append(f"{path.name}: contains an unpinned or unused dependency")

    return errors, len(sources)


def validate_index(video_pages):
    errors = []
    index_path = PROJECT_PATH / "index.html"
    parser = LinkParser()
    parser.feed(index_path.read_text(encoding="utf-8"))

    local_links = set()
    for href in parser.links:
        parsed = urlparse(href)
        if parsed.scheme or parsed.netloc or href.startswith("#"):
            continue
        target = unquote(parsed.path)
        local_links.add(target)
        if not (PROJECT_PATH / target).is_file():
            errors.append(f"index.html: local link does not exist: {target}")

    expected = {path.relative_to(PROJECT_PATH).as_posix() for path in video_pages}
    missing = sorted(expected - local_links)
    for target in missing:
        errors.append(f"index.html: video page is not listed: {target}")
    return errors


def main():
    video_pages = sorted(VIDEOS_PATH.glob("*.html"))
    errors = []
    episode_count = 0

    if not video_pages:
        errors.append("No generated video pages found")

    for path in video_pages:
        page_errors, count = validate_video_page(path)
        errors.extend(page_errors)
        episode_count += count

    errors.extend(validate_index(video_pages))

    if errors:
        print(f"Validation failed with {len(errors)} error(s):", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        f"Validation passed: {len(video_pages)} video pages, "
        f"{episode_count} episodes."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
