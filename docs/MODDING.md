# Writing Vivaldi Mods / Разработка модов Vivaldi

[English](#english) · [Русский](#русский)

This guide describes the conventions used by this project. Vivaldi UI mods depend on internal browser markup and APIs, so they can require maintenance after a Vivaldi update.

---

## English

### 1. Choose the correct mod type

Use a **CSS mod** when the change is purely visual:

- spacing, colours, borders, shadows, opacity;
- hiding or resizing existing controls;
- hover, focus, and active-state styling;
- layout changes that do not require new behaviour.

Use a **JavaScript mod** only when behaviour is required:

- adding controls or menus;
- reacting to clicks, keyboard shortcuts, or tab changes;
- storing mod-specific state;
- calling Vivaldi's internal APIs.

Prefer CSS whenever possible. CSS is easier to disable, does not patch `window.html`, and usually survives browser updates better.

### 2. Inspect the Vivaldi interface

Vivaldi's desktop interface is built with HTML, CSS, and JavaScript. To find suitable selectors:

1. Open `vivaldi://inspect/#apps`.
2. Find the Vivaldi browser UI entry and select **inspect** when available.
3. Use the Elements panel to inspect the exact control you want to change.
4. Test declarations temporarily in DevTools before creating a mod file.
5. Open `vivaldi://themecolors` to inspect theme colour variables.

Internal element names can change between versions. Prefer stable IDs and meaningful classes over deeply nested selectors or generated class names.

### 3. Writing CSS mods

#### Location and naming

Place CSS mods in:

```text
css/custom/
```

Use lowercase Latin letters, digits, and hyphens:

```text
compact-tabs.css       enabled
compact-tabs.css.off   disabled
```

The manager reads the first block comment as the description:

```css
/* Makes inactive tabs slightly transparent. */

#tabs-container .tab:not(.active) {
  opacity: 0.76;
}
```

#### CSS guidelines

- Scope selectors to Vivaldi UI containers such as `#browser`, `#tabs-container`, or `#panels-container`.
- Avoid global selectors such as `div`, `button`, or `*` unless the effect is intentionally global.
- Prefer Vivaldi theme variables instead of fixed colours.
- Use `!important` only when the built-in UI has stronger specificity.
- Preserve visible focus indicators and adequate text contrast.
- Test horizontal and vertical tab positions if the mod affects tabs.
- Test light and dark themes.
- Keep one independent feature per file so it can be disabled separately.

Useful theme variables vary by Vivaldi version, but common examples include:

```css
var(--colorBg)
var(--colorFg)
var(--colorHighlightBg)
var(--colorAccentBg)
```

Example with scoped states:

```css
/* Adds a theme-aware marker to the active tab. */

#browser #tabs-container .tab.active {
  box-shadow: inset 0 3px 0 var(--colorHighlightBg) !important;
}

#browser #tabs-container .tab:not(.active):hover {
  background-color: color-mix(
    in srgb,
    var(--colorHighlightBg) 20%,
    transparent
  ) !important;
}
```

#### Testing a CSS mod

1. Create the file as `.css.off`.
2. Enable it in the web manager.
3. Completely restart Vivaldi.
4. Test normal, hover, active, pinned, stacked, and hibernated tabs when relevant.
5. Check Settings, private windows, and fullscreen mode if the selectors are broad.
6. Disable the mod and verify that the original UI is restored.

If nothing changes, first use an unmistakable temporary rule to confirm that the CSS directory is loaded:

```css
#tabs-tabbar-container {
  outline: 4px solid magenta !important;
}
```

Remove diagnostic rules before committing.

### 4. Writing JavaScript mods

#### Directory structure

Each JS mod belongs in its own directory:

```text
js/example-mod/
├── example-mod.js
├── example-mod.css          optional
├── install.sh
├── disable.sh
├── uninstall.sh
├── install.ps1
├── disable.ps1
├── uninstall.ps1
└── README.md
```

The current manager does not automatically discover arbitrary JS folders. A new mod must also be integrated into `web-manager/server.js` and `web-manager/public/app.js`, or a future manifest-based loader must be added.

#### JavaScript structure

Wrap the mod in an IIFE so it does not leak variables into Vivaldi's UI:

```js
(() => {
  'use strict';

  const MOD_ID = 'example-mod';

  function initialise() {
    const tabContainer = document.querySelector('#tabs-container');
    if (!tabContainer) return;

    tabContainer.addEventListener('dblclick', (event) => {
      if (!(event.target instanceof Element)) return;
      const tab = event.target.closest('.tab');
      if (!tab) return;
      console.info(`[${MOD_ID}] tab double-clicked`);
    });
  }

  // Let Vivaldi finish its initial React render first.
  window.setTimeout(initialise, 1500);
})();
```

#### JavaScript safety guidelines

- Do not modify prototypes or common globals.
- Do not create global variable names; keep code inside an IIFE or module-like closure.
- Delay initialisation until Vivaldi has rendered its UI.
- Scope event delegation to the smallest stable container.
- Check `event.target instanceof Element` before calling `closest()`.
- Do not continuously poll the whole document.
- Avoid observing the entire DOM subtree unless strictly necessary.
- If a `MutationObserver` is required, observe the narrowest possible container and debounce expensive work.
- Make initialisation idempotent so the mod cannot attach duplicate listeners.
- Use unique class names, data attributes, storage keys, and injection markers prefixed with the mod ID.
- Keep privileged filesystem operations in installers, never in UI JavaScript.
- Treat Vivaldi private APIs as unstable and guard every call.
- Log errors with the mod ID, but do not flood the console.

Example idempotency guard:

```js
if (document.documentElement.dataset.exampleModLoaded) return;
document.documentElement.dataset.exampleModLoaded = 'true';
```

#### CSS used by a JS mod

Prefix classes to prevent collisions:

```css
.example-mod-menu { /* ... */ }
.example-mod-button { /* ... */ }
```

Use a very high `z-index` only for short-lived overlays, and ensure overlays can be closed with `Escape` and by clicking outside.

### 5. Installer requirements

JS mods are loaded by adding CSS and script references to Vivaldi's `window.html`. Installers must be conservative and idempotent.

Every installer should:

1. Detect the Vivaldi resources directory instead of assuming a version number.
2. Copy only the mod's own files into its own directory.
3. Use a unique marker, for example `<!-- vmm:example-mod -->`.
4. Create a backup before the first injection.
5. Avoid adding duplicate references.
6. Preserve unrelated user changes and other mods.
7. Provide a disable action that removes injection but keeps installed files.
8. Provide an uninstall action that removes only this mod's injection and directory.
9. Print a clear success or error message.
10. Tell the user to restart Vivaldi.

Never replace the complete `window.html` with a bundled copy. Vivaldi updates its contents between versions.

#### Linux conventions

- Use `#!/usr/bin/env bash` and `set -euo pipefail`.
- Require `sudo` or `pkexec` only for the final installation action.
- Quote every path; project directories may contain spaces.
- Keep targets explicit and never recursively remove a broad or unresolved path.

#### Windows conventions

- Use PowerShell with `Set-StrictMode -Version Latest` and `$ErrorActionPreference = 'Stop'`.
- Detect per-user and Program Files installations.
- Request elevation through the manager only when necessary.
- Preserve UTF-8 encoding when editing `window.html`.
- Quote paths because user profile names and project paths can contain spaces.

Use `js/tab-colors/` as the working reference implementation.

### 6. Integrating a JS mod into the web manager

Until generic manifest discovery is implemented, integration requires explicit code:

1. Add the source directory under `js/<mod-id>/`.
2. Add a status function to `web-manager/server.js`.
3. Compare local and installed file hashes to detect updates.
4. Add fixed API routes for install, enable, disable, repair, uninstall, and source viewing.
5. Route privileged actions only to known installer files.
6. Add a card and controls in `web-manager/public/app.js`.
7. Add the mod to `MODS.md` and both README language sections.
8. Test every state: absent, installed and enabled, installed and disabled, outdated, damaged.

Do not add an API endpoint that accepts arbitrary commands or filesystem paths from the browser.

### 7. Verification checklist

Run static checks:

```bash
node --check web-manager/server.js
node --check web-manager/public/app.js
node --check js/example-mod/example-mod.js
bash -n js/example-mod/*.sh
git diff --check
```

Then verify manually:

- clean Vivaldi startup;
- Settings page renders correctly;
- normal context menus still work;
- the mod can be enabled and disabled repeatedly;
- reinstall does not duplicate injection;
- uninstall restores the original behaviour;
- browser restart and Vivaldi update recovery;
- paths containing spaces;
- Linux and Windows installers when both are provided.

### 8. Commit checklist

- No runtime logs, PID files, activity history, or backups are staged.
- Diagnostic CSS has been removed.
- New files have a concise header or README description.
- Documentation is updated in English and Russian.
- Destructive operations target only the mod's own files.
- `git diff --cached --check` succeeds.

---

## Русский

### 1. Выбор типа мода

Используйте **CSS-мод**, если изменение относится только к оформлению:

- отступы, цвета, рамки, тени и прозрачность;
- скрытие или изменение размеров существующих элементов;
- состояния наведения, фокуса и активности;
- изменения раскладки, которым не требуется новая логика.

Используйте **JavaScript-мод**, только если нужно новое поведение:

- добавление кнопок или меню;
- обработка кликов, клавиатуры или изменений вкладок;
- хранение собственного состояния;
- обращение к внутренним API Vivaldi.

По возможности выбирайте CSS: его проще отключить, он не изменяет `window.html` и обычно лучше переживает обновления браузера.

### 2. Исследование интерфейса Vivaldi

Интерфейс настольного Vivaldi построен на HTML, CSS и JavaScript. Для поиска селекторов:

1. Откройте `vivaldi://inspect/#apps`.
2. Найдите интерфейс Vivaldi и выберите **inspect**, если этот пункт доступен.
3. Через панель Elements найдите нужный элемент.
4. Сначала временно проверьте CSS в DevTools.
5. Откройте `vivaldi://themecolors`, чтобы посмотреть переменные цветов темы.

Внутренняя разметка может меняться между версиями. Предпочитайте стабильные ID и осмысленные классы глубоко вложенным селекторам и генерируемым именам.

### 3. Создание CSS-модов

#### Расположение и имена

Помещайте CSS-моды в:

```text
css/custom/
```

Используйте строчные латинские буквы, цифры и дефисы:

```text
compact-tabs.css       включён
compact-tabs.css.off   выключен
```

Первый блочный комментарий используется менеджером как описание:

```css
/* Делает неактивные вкладки немного прозрачными. */

#tabs-container .tab:not(.active) {
  opacity: 0.76;
}
```

#### Рекомендации по CSS

- Ограничивайте селекторы контейнерами Vivaldi: `#browser`, `#tabs-container`, `#panels-container`.
- Не используйте глобальные `div`, `button` или `*`, если эффект не должен быть глобальным.
- Предпочитайте переменные темы Vivaldi фиксированным цветам.
- Используйте `!important` только при необходимости перебить встроенную специфичность.
- Не скрывайте индикаторы клавиатурного фокуса и сохраняйте достаточный контраст.
- Для вкладок проверяйте горизонтальное и вертикальное расположение.
- Проверяйте светлую и тёмную темы.
- Храните одну независимую функцию в одном файле.

Часто используемые переменные темы:

```css
var(--colorBg)
var(--colorFg)
var(--colorHighlightBg)
var(--colorAccentBg)
```

Пример:

```css
/* Добавляет зависящий от темы индикатор активной вкладки. */

#browser #tabs-container .tab.active {
  box-shadow: inset 0 3px 0 var(--colorHighlightBg) !important;
}

#browser #tabs-container .tab:not(.active):hover {
  background-color: color-mix(
    in srgb,
    var(--colorHighlightBg) 20%,
    transparent
  ) !important;
}
```

#### Проверка CSS-мода

1. Создайте файл с окончанием `.css.off`.
2. Включите его через веб-менеджер.
3. Полностью перезапустите Vivaldi.
4. При необходимости проверьте обычные, активные, закреплённые, сгруппированные и выгруженные вкладки.
5. Для широких селекторов проверьте настройки, приватное окно и полноэкранный режим.
6. Выключите мод и убедитесь, что исходный интерфейс восстановился.

Если изменений не видно, временно используйте очевидное правило для проверки загрузки каталога:

```css
#tabs-tabbar-container {
  outline: 4px solid magenta !important;
}
```

Перед коммитом удаляйте диагностические правила.

### 4. Создание JavaScript-модов

#### Структура каталога

Каждый JS-мод хранится отдельно:

```text
js/example-mod/
├── example-mod.js
├── example-mod.css          необязательно
├── install.sh
├── disable.sh
├── uninstall.sh
├── install.ps1
├── disable.ps1
├── uninstall.ps1
└── README.md
```

Сейчас менеджер не обнаруживает произвольные JS-папки автоматически. Новый мод необходимо отдельно интегрировать в `web-manager/server.js` и `web-manager/public/app.js` либо предварительно реализовать загрузчик манифестов.

#### Структура JavaScript

Оберните код в IIFE, чтобы не создавать глобальные переменные:

```js
(() => {
  'use strict';

  const MOD_ID = 'example-mod';

  function initialise() {
    const tabContainer = document.querySelector('#tabs-container');
    if (!tabContainer) return;

    tabContainer.addEventListener('dblclick', (event) => {
      if (!(event.target instanceof Element)) return;
      const tab = event.target.closest('.tab');
      if (!tab) return;
      console.info(`[${MOD_ID}] tab double-clicked`);
    });
  }

  window.setTimeout(initialise, 1500);
})();
```

#### Безопасность JavaScript

- Не изменяйте прототипы и общие глобальные объекты.
- Не создавайте глобальных имён; используйте IIFE или замыкание.
- Запускайте инициализацию после первоначальной отрисовки Vivaldi.
- Делегируйте события на минимальном стабильном контейнере.
- Перед `closest()` проверяйте `event.target instanceof Element`.
- Не опрашивайте весь документ бесконечным таймером.
- Не наблюдайте всё DOM-дерево без строгой необходимости.
- Для `MutationObserver` выбирайте минимальный контейнер и ограничивайте частоту тяжёлой работы.
- Делайте инициализацию идемпотентной, чтобы обработчики не подключались повторно.
- Используйте уникальные классы, data-атрибуты, ключи хранилища и маркеры с ID мода.
- Привилегированные файловые операции должны находиться в установщиках, а не в UI-коде.
- Считайте внутренние API Vivaldi нестабильными и проверяйте возможность каждого вызова.
- Помечайте ошибки ID мода и не засоряйте консоль.

Защита от повторной инициализации:

```js
if (document.documentElement.dataset.exampleModLoaded) return;
document.documentElement.dataset.exampleModLoaded = 'true';
```

#### CSS для JS-мода

Добавляйте уникальный префикс:

```css
.example-mod-menu { /* ... */ }
.example-mod-button { /* ... */ }
```

Очень большой `z-index` используйте только для временных окон. Такое окно должно закрываться через `Escape` и кликом снаружи.

### 5. Требования к установщикам

JS-мод подключается добавлением ссылок на CSS и скрипт в `window.html`. Установщик должен быть осторожным и идемпотентным.

Установщик обязан:

1. Находить каталог ресурсов Vivaldi без жёсткой привязки к версии.
2. Копировать только собственные файлы мода в отдельный каталог.
3. Использовать уникальный маркер, например `<!-- vmm:example-mod -->`.
4. Создавать резервную копию до первой инъекции.
5. Не добавлять ссылки повторно.
6. Сохранять изменения пользователя и других модов.
7. Иметь отключение, которое удаляет инъекцию, но сохраняет файлы.
8. Иметь удаление только своей инъекции и собственного каталога.
9. Выводить понятный результат или ошибку.
10. Напоминать о перезапуске Vivaldi.

Никогда не заменяйте весь `window.html` заранее сохранённой копией: его содержимое меняется при обновлениях Vivaldi.

#### Соглашения Linux

- Используйте `#!/usr/bin/env bash` и `set -euo pipefail`.
- Запрашивайте `sudo` или `pkexec` только для установки в системный каталог.
- Заключайте пути в кавычки: каталог проекта может содержать пробелы.
- Не выполняйте рекурсивное удаление широкого или неразрешённого пути.

#### Соглашения Windows

- Используйте PowerShell, `Set-StrictMode -Version Latest` и `$ErrorActionPreference = 'Stop'`.
- Ищите установку текущего пользователя и Program Files.
- Повышайте права через менеджер только при необходимости.
- Сохраняйте UTF-8 при редактировании `window.html`.
- Учитывайте пробелы в имени пользователя и пути проекта.

Используйте `js/tab-colors/` как рабочий эталон.

### 6. Интеграция JS-мода с веб-менеджером

До появления автоматических манифестов интеграция выполняется явно:

1. Добавьте исходники в `js/<идентификатор>/`.
2. Добавьте проверку состояния в `web-manager/server.js`.
3. Сравнивайте хеши локальных и установленных файлов для обнаружения обновлений.
4. Создайте фиксированные API для установки, включения, выключения, восстановления, удаления и просмотра кода.
5. Разрешайте привилегированный запуск только известных установщиков.
6. Добавьте карточку и элементы управления в `web-manager/public/app.js`.
7. Обновите `MODS.md` и обе языковые части README.
8. Проверьте все состояния: отсутствует, включён, выключен, устарел, повреждён.

Не добавляйте API, принимающий от браузера произвольную команду или файловый путь.

### 7. Проверка

Статические проверки:

```bash
node --check web-manager/server.js
node --check web-manager/public/app.js
node --check js/example-mod/example-mod.js
bash -n js/example-mod/*.sh
git diff --check
```

Затем вручную проверьте:

- чистый запуск Vivaldi;
- нормальное открытие настроек;
- сохранение штатных контекстных меню;
- повторное включение и выключение;
- отсутствие дублирующей инъекции после переустановки;
- восстановление штатного поведения после удаления;
- перезапуск и восстановление после обновления Vivaldi;
- путь с пробелами;
- установщики Linux и Windows, если поддерживаются обе платформы.

### 8. Проверка перед коммитом

- В индекс не попали журналы, PID, история действий и резервные копии.
- Диагностический CSS удалён.
- У новых файлов есть краткое описание или README.
- Документация обновлена на английском и русском.
- Удаление затрагивает только файлы конкретного мода.
- `git diff --cached --check` завершается без ошибок.
