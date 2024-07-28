from glob import glob
import os

GIT_PATH = "/Users/yezhuo/TV-Related/zye9312.github.io/"


os.chdir(VIDEO_PATH)
links_ = glob("video/*.html")
links_.sort(key=os.path.getmtime, reverse=True)
# links_.remove("index.html")
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
        </ul>
    </nav>
    <button id="random-button">Random Page</button>
    <script src="index.js"></script>
</body>
</html>
"""
open("index.html", "w").write(index_html)

# upload to git and commit
try:
    import subprocess

    # Change directory to the Git repository root directory
    subprocess.run(["cd", GIT_PATH], check=True)

    # Stage all modified files
    subprocess.run(["git", "add", "."], cwd=GIT_PATH, check=True)

    # Commit the changes with a commit message
    subprocess.run(["git", "commit", "-m", "Add"], cwd=GIT_PATH, check=True)

    # Push the changes to the remote repository
    subprocess.run(["git", "push", "origin", "main"], cwd=GIT_PATH, check=True)
except:
    pass
