#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export TV2HTML_DIR="${TV2HTML_DIR:-${SITE_DIR}/../tv2html}"

python3 "${SITE_DIR}/scripts/update_videos.py"
python3 "${SITE_DIR}/validate_site.py"
node "${SITE_DIR}/tests/player_state_test.js"
