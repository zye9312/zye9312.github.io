from glob import glob
import os

os.chdir("/Users/yezhuo/TV-Related/zye9312.github.io/")
links_ = glob("*.html")
links_.sort(key=os.path.getmtime, reverse=True)
links_.remove("index.html")
# links_ = sorted(links_)
titles = [html.rsplit(" ", 2)[0].replace("_", " ") for html in links_]
links = [link for link in links_]
li_s = "\n".join(
    [f'<li><a href="{link}">{title}</a></li>' for link, title in zip(links, titles)]
)

index_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset=utf-8 />
    <title>TV</title>
    <link rel="stylesheet" href="index.css">
</head>
<body>
    <h1>TV</h1>

    <button id="youtube_src" onclick="changeVideo()">Change video</button>

    <br>
    <iframe id="video-iframe" width="725" height="408" src="https://www.youtube.com/embed/0Iwr1arwtbU" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>

    <nav>
        <ul id="nav-menu">
            {li_s}

        </ul>
    </nav>
    <button id="random-button">Random Page</button>
    <script src="index.js"></script>
</body>
</html>
"""
open("index.html", "w").write(index_html)
