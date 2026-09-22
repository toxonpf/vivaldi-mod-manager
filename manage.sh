#!/usr/bin/env bash
# Local manager for the Vivaldi mods in this directory.
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
css_dir="$root_dir/css/custom"
tab_colors_dir="$root_dir/js/tab-colors"
window_html='/opt/vivaldi/resources/vivaldi/window.html'

usage() {
  cat <<'EOF'
Usage:
  ./manage.sh list
  ./manage.sh enable-css <name>
  ./manage.sh disable-css <name>
  ./manage.sh js-status
  ./manage.sh install-tab-colors
  ./manage.sh uninstall-tab-colors
EOF
}

valid_name() {
  [[ $1 =~ ^[a-z0-9][a-z0-9-]*$ ]]
}

list_mods() {
  echo 'CSS:'
  shopt -s nullglob
  for file in "$css_dir"/*.css "$css_dir"/*.css.off; do
    name=$(basename "$file")
    if [[ $name == *.css.off ]]; then
      printf '  OFF  %s\n' "${name%.css.off}"
    else
      printf '  ON   %s\n' "${name%.css}"
    fi
  done
  echo 'JS:'
  if grep -Fq '<!-- user-tab-colors-mod -->' "$window_html" 2>/dev/null; then
    echo '  ON   tab-colors'
  else
    echo '  OFF  tab-colors'
  fi
}

enable_css() {
  valid_name "$1" || { echo 'Некорректное имя мода.' >&2; exit 2; }
  if [[ -f "$css_dir/$1.css" ]]; then
    echo "CSS-мод '$1' уже включён."
  elif [[ -f "$css_dir/$1.css.off" ]]; then
    mv "$css_dir/$1.css.off" "$css_dir/$1.css"
    echo "Включён '$1'. Перезапустите Vivaldi."
  else
    echo "CSS-мод '$1' не найден." >&2
    exit 1
  fi
}

disable_css() {
  valid_name "$1" || { echo 'Некорректное имя мода.' >&2; exit 2; }
  if [[ -f "$css_dir/$1.css.off" ]]; then
    echo "CSS-мод '$1' уже выключен."
  elif [[ -f "$css_dir/$1.css" ]]; then
    mv "$css_dir/$1.css" "$css_dir/$1.css.off"
    echo "Выключен '$1'. Перезапустите Vivaldi."
  else
    echo "CSS-мод '$1' не найден." >&2
    exit 1
  fi
}

case "${1:-}" in
  list) list_mods ;;
  enable-css) [[ $# -eq 2 ]] || { usage; exit 2; }; enable_css "$2" ;;
  disable-css) [[ $# -eq 2 ]] || { usage; exit 2; }; disable_css "$2" ;;
  js-status)
    if grep -Fq '<!-- user-tab-colors-mod -->' "$window_html" 2>/dev/null; then
      echo 'tab-colors: включён'
    else
      echo 'tab-colors: выключен'
    fi
    ;;
  install-tab-colors) exec sudo "$tab_colors_dir/install.sh" ;;
  uninstall-tab-colors) exec sudo "$tab_colors_dir/uninstall.sh" ;;
  *) usage; exit 2 ;;
esac
