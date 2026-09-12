# Personal TV Library

A static GitHub Pages site for the generated TV playback pages.

## Layout

- `index.html`, `index.css`, `index.js`: library home page.
- `videos/*.html`: active generated playback pages.
- `videos/archive/`: retired pages, excluded from the home page.
- `assets/player/`: shared Video.js player, playback state, and styles.
- `validate_site.py`: checks generated pages, links, IDs, URLs, and dependencies.
- `.github/workflows/static.yml`: deploys the repository as a static Pages site.
