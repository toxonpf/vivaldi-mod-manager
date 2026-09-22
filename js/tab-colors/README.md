# Individual tab colours for Vivaldi

This small local mod gives ordinary tabs a manual colour picker.

## Use

After installation, hold **Shift** and right-click a tab. Pick a preset, click the coloured square for any colour, or choose **Сбросить цвет**. A normal right-click still opens Vivaldi's standard menu. Colours are kept during the current Vivaldi session; they reset after the browser is fully closed.

## Install

Close Vivaldi, then run:

```bash
cd ~/vivaldi-tab-colors
sudo ./install.sh
```

Restart Vivaldi afterwards.

The mod changes `/opt/vivaldi/resources/vivaldi/window.html`, with a backup created at `window.html.user-tab-colors-backup`. Vivaldi updates may replace that file, so run the installer again after a browser update.

## Remove

```bash
cd ~/vivaldi-tab-colors
sudo ./uninstall.sh
```

To disable the mod without removing its installed files:

```bash
sudo ./disable.sh
```
