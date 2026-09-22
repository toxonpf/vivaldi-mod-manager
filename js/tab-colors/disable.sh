#!/usr/bin/env bash
# Disables the mod without deleting its installed files. Run as root via pkexec/sudo.
set -euo pipefail

window_html='/opt/vivaldi/resources/vivaldi/window.html'

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run with sudo or pkexec.'
  exit 1
fi

sed -i '/<!-- user-tab-colors-mod -->/d; /user-tab-colors\/tab-colors\.css/d; /user-tab-colors\/tab-colors\.js/d' "$window_html"
echo 'Disabled. Restart Vivaldi.'
