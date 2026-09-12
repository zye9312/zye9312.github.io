# Personal TV Library

A static GitHub Pages site for the generated TV playback pages.

## Layout

- `index.html`, `index.css`, `index.js`: library home page.
- `videos/*.html`: active generated playback pages.
- `videos/archive/`: retired pages, excluded from the home page.
- `assets/player/`: shared native-video setup and responsive styles.
- `validate_site.py`: checks generated pages, links, URLs, and dependencies.
- `.github/workflows/static.yml`: deploys the repository as a static Pages site.

## TODO

The site currently favors browser-native HLS playback. Episode memory, manual
resume, and manual intro/outro skipping deliberately avoid automatic seeking.
Consider these only after they can be verified not to interfere with native
seeking or fullscreen:

- Provide playback-rate controls and keyboard shortcuts.
- Download the selected M3U8 playlist.
- Add a carefully tested fallback for browsers without native HLS support.
- Optionally skip intro/outro automatically without overriding native seeking.
