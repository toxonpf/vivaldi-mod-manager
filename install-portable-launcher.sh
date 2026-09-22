#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
bin_dir="${XDG_BIN_HOME:-$HOME/.local/bin}"
data_root="${XDG_DATA_HOME:-$HOME/.local/share}/vivaldi-mod-manager"
applications_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

mkdir -p "$bin_dir" "$data_root" "$applications_dir"
install -m 755 "$root_dir/packaging/vivaldi-mod-manager" "$bin_dir/vivaldi-mod-manager"
install -m 644 "$root_dir/packaging/vivaldi-mod-manager.desktop" "$applications_dir/vivaldi-mod-manager.desktop"
ln -sfn "$root_dir" "$data_root/current"

echo "Installed command: $bin_dir/vivaldi-mod-manager"
echo 'The application is also available as “Vivaldi Mod Manager” in the desktop menu.'
