from html import escape
from pathlib import Path
from urllib.parse import quote

PROJECT_PATH = Path(__file__).resolve().parent
VIDEOS_PATH = PROJECT_PATH / "videos"

links = sorted(VIDEOS_PATH.glob("*.html"), key=lambda link: link.stat().st_mtime, reverse=True)


def get_title(path: Path) -> str:
    """Remove the source and numeric ID suffix from a generated filename."""
    parts = path.stem.rsplit(" ", 2)
    title = parts[0] if len(parts) == 3 else path.stem
    return title.replace("_", " ").strip()


li_s = "\n".join(
    f'<li><a href="{escape(quote(path.relative_to(PROJECT_PATH).as_posix()))}">'
    f'{escape(get_title(path))}</a></li>'
    for path in links
)

index_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset=utf-8 />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TV</title>
    <link rel="stylesheet" href="index.css">
</head>
<body>
    <h1>TV</h1>

    <button id="youtube_src" onclick="changeVideo()">Change video</button>

    <br>
    <div class="video-container">
        <iframe id="video-iframe" src="https://www.youtube.com/embed/0Iwr1arwtbU" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>

    <nav>
        <ul id="nav-menu">
                {li_s}
        <li><a href="bilibili/new.html">bilibili</a></li>
        <li><a href="https://m.ghw9zwp5.com">金牌影院</a></li>
        <li><a href="https://www.dbku.tv">独播库</a></li>
        <li><a href="https://gz360.tv">瓜子影视</a></li>
        <li><a href="https://aigua8.com">爱瓜TV</a></li>
        </ul>
    </nav>
    <button id="random-button">Random Page</button>
    <script src="index.js"></script>
</body>
</html>
"""
(PROJECT_PATH / "index.html").write_text(index_html, encoding="utf-8")
