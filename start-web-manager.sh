#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
manager_url='http://127.0.0.1:43777'
runtime_dir="$root_dir/web-manager/runtime"
log_file="$runtime_dir/server.log"
pid_file="$runtime_dir/server.pid"
legacy_css_link="$HOME/vivaldi-css-mods"
legacy_tab_colors_link="$HOME/vivaldi-tab-colors"
portable_data_root="${XDG_DATA_HOME:-$HOME/.local/share}/vivaldi-mod-manager"
portable_current_link="$portable_data_root/current"

# Keep Vivaldi's previously selected stable paths working after this project
# directory is moved. Real directories are never overwritten.
mkdir -p "$portable_data_root"
if [[ -L $portable_current_link || ! -e $portable_current_link ]]; then
  ln -sfn "$root_dir" "$portable_current_link"
fi
if [[ -L $legacy_css_link || ! -e $legacy_css_link ]]; then
  ln -sfn "$root_dir/css/custom" "$legacy_css_link"
fi
if [[ -L $legacy_tab_colors_link || ! -e $legacy_tab_colors_link ]]; then
  ln -sfn "$root_dir/js/tab-colors" "$legacy_tab_colors_link"
fi

open_manager() {
  nohup /usr/bin/vivaldi "$manager_url" >/dev/null 2>&1 &
}

if curl --fail --silent --max-time 1 "$manager_url/api/status" >/dev/null 2>&1; then
  echo 'Менеджер уже запущен — открываю вкладку Vivaldi.'
  open_manager
  exit 0
fi

mkdir -p "$runtime_dir"
nohup node "$root_dir/web-manager/server.js" >"$log_file" 2>&1 &
server_pid=$!
printf '%s\n' "$server_pid" >"$pid_file"

for _attempt in {1..30}; do
  if curl --fail --silent --max-time 1 "$manager_url/api/status" >/dev/null 2>&1; then
    echo 'Менеджер запущен — открываю вкладку Vivaldi.'
    open_manager
    exit 0
  fi
  sleep 0.1
done

echo "Не удалось запустить менеджер. Журнал: $log_file" >&2
exit 1
