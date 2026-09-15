#!/usr/bin/env python3
"""Update configured TV pages using the sibling tv2html checkout."""

import json
import os
import subprocess
import argparse
from pathlib import Path


SITE_DIR = Path(__file__).resolve().parents[1]
TV2HTML_DIR = Path(os.environ.get("TV2HTML_DIR", SITE_DIR.parent / "tv2html"))
CONFIG_PATH = SITE_DIR / "shows.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--show", help="Only update the configured show with this name")
    args = parser.parse_args()

    shows = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if not isinstance(shows, list) or not shows:
        raise ValueError("shows.json must contain at least one show")

    if args.show:
        shows = [show for show in shows if show.get("name") == args.show]
        if not shows:
            raise ValueError(f"Show not found in shows.json: {args.show}")

    export_path = SITE_DIR / "videos"
    export_path.mkdir(parents=True, exist_ok=True)

    for show in shows:
        name = show["name"]
        url = show["url"]
        print(f"Updating {name}: {url}")
        env = os.environ.copy()
        env["TV2HTML_EXPORT_PATH"] = str(export_path)
        subprocess.run(
            ["python3", str(TV2HTML_DIR / "tv2html.py"), url],
            cwd=TV2HTML_DIR,
            env=env,
            check=True,
        )

    subprocess.run(["python3", str(SITE_DIR / "index.py")], cwd=SITE_DIR, check=True)


if __name__ == "__main__":
    main()
