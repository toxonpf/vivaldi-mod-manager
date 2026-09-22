#!/usr/bin/env bash
# Installs the local Vivaldi tab-colour mod. Run as: sudo ./install.sh
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
vivaldi_dir='/opt/vivaldi/resources/vivaldi'
window_html="$vivaldi_dir/window.html"
mod_dir="$vivaldi_dir/user-tab-colors"
marker='<!-- user-tab-colors-mod -->'

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this installer with sudo: sudo ./install.sh'
  exit 1
fi

install -d -m 755 "$mod_dir"
install -m 644 "$script_dir/tab-colors.js" "$mod_dir/tab-colors.js"
install -m 644 "$script_dir/tab-colors.css" "$mod_dir/tab-colors.css"

if ! grep -Fqx "$marker" "$window_html"; then
  cp -p "$window_html" "$window_html.user-tab-colors-backup"
  sed -i "s#</body>#  $marker\\n  <link rel=\"stylesheet\" href=\"user-tab-colors/tab-colors.css\" />\\n  <script src=\"user-tab-colors/tab-colors.js\"></script>\\n</body>#" "$window_html"
fi

echo 'Installed. Restart Vivaldi. Use Shift + right-click on a tab to set its colour.'
