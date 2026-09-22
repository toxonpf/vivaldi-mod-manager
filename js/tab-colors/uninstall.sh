#!/usr/bin/env bash
# Removes only the injection and files created by install.sh. Run as: sudo ./uninstall.sh
set -euo pipefail

vivaldi_dir='/opt/vivaldi/resources/vivaldi'
window_html="$vivaldi_dir/window.html"
mod_dir="$vivaldi_dir/user-tab-colors"

if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this uninstaller with sudo: sudo ./uninstall.sh'
  exit 1
fi

sed -i '/<!-- user-tab-colors-mod -->/d; /user-tab-colors\/tab-colors\.css/d; /user-tab-colors\/tab-colors\.js/d' "$window_html"
rm -rf "$mod_dir"
echo 'Removed. Restart Vivaldi.'
