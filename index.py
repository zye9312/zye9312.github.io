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


def get_source(path: Path) -> str:
    """Return a short display name for the source suffix in the filename."""
    parts = path.stem.rsplit(" ", 2)
    source = parts[1] if len(parts) == 3 else "local"
    return {"duboku": "独播库", "liangzi": "量子"}.get(source, source.upper())


li_s = "\n".join(
    f'<li class="library-item"><a href="{escape(quote(path.relative_to(PROJECT_PATH).as_posix()))}">'
    f'<span class="card-title">{escape(get_title(path))}</span>'
    f'<span class="card-meta">{escape(get_source(path))}</span></a></li>'
    for path in links
)

index_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset=utf-8 />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>私人影视库</title>
    <link rel="stylesheet" href="index.css?v=2">
</head>
<body>
    <header class="home-header">
        <div>
            <p class="eyebrow">PERSONAL SCREENING ROOM</p>
            <h1>私人影视库</h1>
        </div>
        <button id="random-button" type="button">随机打开</button>
    </header>

    <main class="home-page">
        <section class="featured-panel" aria-labelledby="featured-title">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">FEATURED</p>
                    <h2 id="featured-title">随便看看</h2>
                </div>
                <button id="youtube_src" type="button" onclick="changeVideo()">换一个视频</button>
            </div>
            <div class="video-container">
                <iframe id="video-iframe" title="推荐视频" src="https://www.youtube.com/embed/0Iwr1arwtbU" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
        </section>

        <section class="library-panel" aria-labelledby="library-title">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">LIBRARY</p>
                    <h2 id="library-title">我的剧集</h2>
                </div>
                <span class="item-count">{len(links)} 部</span>
            </div>
            <nav aria-label="剧集列表">
                <ul id="nav-menu" class="library-grid">
                    {li_s}
                </ul>
            </nav>
        </section>

        <section class="resource-panel" aria-labelledby="resource-title">
            <div class="section-heading">
                <div>
                    <p class="eyebrow">MORE</p>
                    <h2 id="resource-title">其他入口</h2>
                </div>
            </div>
            <ul class="resource-grid">
                <li><a href="bilibili/new.html">Bilibili 热门</a></li>
                <li><a href="https://m.ghw9zwp5.com">金牌影院</a></li>
                <li><a href="https://www.dbku.tv">独播库</a></li>
                <li><a href="https://gz360.tv">瓜子影视</a></li>
                <li><a href="https://aigua8.com">爱瓜 TV</a></li>
            </ul>
        </section>
    </main>
    <script src="index.js?v=2"></script>
</body>
</html>
"""
(PROJECT_PATH / "index.html").write_text(index_html, encoding="utf-8")
