# Vivaldi Mod Manager

[English](#english) · [Русский](#русский)

A local, cross-platform manager for Vivaldi UI modifications. It keeps CSS and JavaScript mods organized, provides a browser-based control panel, and safely handles the elevated operations required by Vivaldi JavaScript mods.

---

## English

### Features

- Local web interface at `http://127.0.0.1:43777`.
- Search and filtering for CSS mods.
- Enable and disable CSS mods without deleting them.
- Create and edit CSS mods in the built-in editor.
- Recoverable trash for removed CSS mods.
- Activity history for manager actions.
- Install, enable, disable, repair, update, inspect, and remove the bundled JavaScript mod.
- Integrity checks that compare installed JS/CSS files with their local sources.
- Linux and Windows launchers and installers.
- Automatic server shutdown after the last manager tab is closed.
- Localhost-only server, origin checks, CSP headers, validated file names, and fixed privileged actions.

### Included mods

| Type | Mod | Description |
| --- | --- | --- |
| CSS | `compact-tabs` | Makes horizontal tabs more compact. |
| CSS | `tab-hover-highlight` | Adds a subtle highlight to a tab under the pointer. |
| CSS | `clear-active-tab` | Adds a visible indicator to the active tab. |
| JS | `tab-colors` | Opens a manual tab-colour palette with `Shift + right-click`. |

CSS mods are disabled by default. The `tab-colors` source includes installers for Linux and Windows.

### Directory layout

```text
vivaldi-mods/
├── css/
│   └── custom/                 CSS mods used by Vivaldi
├── js/
│   └── tab-colors/             JS source, CSS, and platform installers
├── docs/MODDING.md             CSS and JS authoring guide
├── trash/                      Recoverable CSS files; created at runtime
├── web-manager/
│   ├── public/                 Web interface
│   ├── server.js               Local Node.js server
│   └── runtime/                PID and logs; created at runtime
├── manage.sh                   Linux command-line manager
├── install-portable-launcher.sh Linux global-command installer
├── packaging/                  Global launcher and desktop entry
├── start-web-manager.sh        Linux launcher
├── start-web-manager.bat       Windows double-click launcher
├── start-web-manager.ps1       Windows launcher implementation
├── MODS.md                     Short mod catalogue
└── README.md
```

### Requirements

#### Linux

- Vivaldi Desktop.
- Node.js available as `node`.
- Bash and `curl`.
- `pkexec` for privileged JS-mod actions in the web interface, or `sudo` for manual installation.

#### Windows

- Vivaldi Desktop installed for the current user or under Program Files.
- Node.js available as `node`.
- Windows PowerShell 5.1 or later.

### Initial Vivaldi CSS setup

1. Open `vivaldi://experiments`.
2. Enable **Allow for using CSS modifications**.
3. Open **Settings → Appearance → Custom UI Modifications**.
4. Select the `vivaldi-mods/css/custom` directory.
5. Restart Vivaldi after changing the enabled CSS files.

On this Linux installation, the legacy path `~/vivaldi-css-mods` is a symbolic link to the same directory.
The Linux launcher refreshes this compatibility link automatically when the project directory is moved.

### Running on Linux

Install the portable command once:

```bash
./install-portable-launcher.sh
```

After that, the manager can be launched from any working directory or from the desktop application menu:

```bash
vivaldi-mod-manager
```

The command keeps a stable registration of the current project directory. If the project is moved again within the home directory, the launcher searches for it and repairs the registration automatically.

Direct project launch remains available:

```bash
./start-web-manager.sh
```

The launcher behaves as follows:

- If the server is stopped, it starts it in the background and opens Vivaldi.
- If the server is already running, it only opens a new manager tab.
- The terminal does not need to remain open.
- The server stops five seconds after the last manager tab is closed.
- Reloading the page does not stop the server.

The optional command-line interface is also available:

```bash
./manage.sh list
./manage.sh enable-css compact-tabs
./manage.sh disable-css compact-tabs
./manage.sh js-status
./manage.sh install-tab-colors
./manage.sh uninstall-tab-colors
```

### Running on Windows

1. Copy the complete `vivaldi-mods` directory to Windows.
2. Install Node.js and confirm that `node` works in a terminal.
3. Double-click `start-web-manager.bat`.

The batch file invokes `start-web-manager.ps1`. It starts the local server in the background when needed and opens `http://127.0.0.1:43777` in Vivaldi. JS-mod actions use a standard Windows administrator confirmation dialog.

### Where to place mods

#### CSS mods

Place CSS files in:

```text
vivaldi-mods/css/custom/
```

- `example.css` is enabled.
- `example.css.off` is disabled.
- A CSS mod can also be created with **+ New CSS** in the web interface. New mods start disabled.
- The first `/* comment */` in a file is used as its description in the web interface.

#### JavaScript mods

Place each JavaScript mod in its own directory:

```text
vivaldi-mods/js/<mod-id>/
```

Vivaldi JS mods are not ordinary browser extensions. They modify files inside the Vivaldi installation and therefore require platform-specific installers, elevated permissions, and integration with the manager. At present, `js/tab-colors` is the fully integrated JS mod; copying an arbitrary `.js` file into `js/` will not automatically install or display it.

### Using the tab-colours mod

1. Install or enable `tab-colors` from the web manager.
2. Completely restart Vivaldi.
3. Hold `Shift` and right-click an ordinary tab.
4. Pick a preset, choose a custom colour, or reset the colour.

The current safe implementation keeps assigned colours only for the active Vivaldi session. Normal right-click behaviour is unchanged.

Manual Linux commands:

```bash
cd /path/to/vivaldi-mod-manager/js/tab-colors
sudo ./install.sh
sudo ./disable.sh
sudo ./uninstall.sh
```

Equivalent `.ps1` scripts are included for Windows and are normally invoked by the web manager.

### Vivaldi updates

- CSS mods normally remain configured, although Vivaldi UI selector changes may require CSS updates.
- Vivaldi updates can replace `window.html` and disable JS injection.
- If `tab-colors` shows **Update available**, **Damaged**, or **Disabled**, use the corresponding repair or enable action in the web interface.
- The installer creates `window.html.user-tab-colors-backup` before its first injection.

### Security model

- The server binds only to `127.0.0.1`.
- Write requests must come from the manager origin and use JSON.
- Mod names are restricted to lowercase Latin letters, digits, and hyphens.
- CSS deletion moves files to a recoverable local trash directory.
- The backend exposes fixed privileged JS actions instead of arbitrary shell commands.
- Linux uses `pkexec`; Windows uses `Run as administrator` through PowerShell.

Review third-party CSS and JavaScript before adding it. A Vivaldi JS mod executes inside the browser interface and should be treated as trusted local code.

### Troubleshooting

- **The page does not open:** run the platform launcher again and inspect `web-manager/runtime/` logs.
- **CSS changes are not visible:** verify the Custom UI Modifications directory and restart Vivaldi.
- **A JS action is cancelled:** approve the Linux polkit or Windows administrator prompt.
- **The manager reports a damaged JS mod:** use **Repair/Reinstall**, then restart Vivaldi.
- **Port 43777 is busy:** stop the process using that port before starting the manager.

### Development checks

```bash
node --check web-manager/server.js
node --check web-manager/public/app.js
bash -n manage.sh start-web-manager.sh js/tab-colors/*.sh
```

Runtime files and personal activity history are excluded from Git through `.gitignore`.

### Writing your own mods

See [docs/MODDING.md](docs/MODDING.md) for CSS and JavaScript conventions, safe installer requirements, manager integration, testing, and the commit checklist.

---

## Русский

### Возможности

- Локальная веб-панель по адресу `http://127.0.0.1:43777`.
- Поиск и фильтрация CSS-модов.
- Включение и выключение CSS-модов без удаления.
- Создание и редактирование CSS во встроенном редакторе.
- Восстанавливаемая корзина для удалённых CSS-модов.
- Журнал действий менеджера.
- Установка, включение, выключение, восстановление, обновление, просмотр и удаление комплектного JS-мода.
- Проверка целостности установленных JS/CSS-файлов.
- Запуск и установка на Linux и Windows.
- Автоматическая остановка сервера после закрытия последней вкладки менеджера.
- Работа только на localhost, проверка origin, CSP, проверка имён файлов и фиксированный набор привилегированных действий.

### Комплектные моды

| Тип | Мод | Назначение |
| --- | --- | --- |
| CSS | `compact-tabs` | Делает горизонтальные вкладки компактнее. |
| CSS | `tab-hover-highlight` | Мягко подсвечивает вкладку под курсором. |
| CSS | `clear-active-tab` | Добавляет заметный индикатор активной вкладки. |
| JS | `tab-colors` | Открывает палитру цветов по `Shift + ПКМ` на вкладке. |

CSS-моды изначально выключены. Для `tab-colors` имеются установщики Linux и Windows.

### Структура каталогов

```text
vivaldi-mods/
├── css/
│   └── custom/                 CSS-моды, подключаемые Vivaldi
├── js/
│   └── tab-colors/             JS, CSS и платформенные установщики
├── docs/MODDING.md             Руководство по созданию CSS и JS
├── trash/                      Восстанавливаемые CSS; создаётся автоматически
├── web-manager/
│   ├── public/                 Веб-интерфейс
│   ├── server.js               Локальный сервер Node.js
│   └── runtime/                PID и журналы; создаётся автоматически
├── manage.sh                   Консольный менеджер Linux
├── install-portable-launcher.sh Установка глобальной команды
├── packaging/                  Глобальный запускатель и ярлык приложения
├── start-web-manager.sh        Запуск в Linux
├── start-web-manager.bat       Запуск двойным кликом в Windows
├── start-web-manager.ps1       Логика запуска Windows
├── MODS.md                     Краткий каталог модов
└── README.md
```

### Требования

#### Linux

- Vivaldi Desktop.
- Node.js, доступный командой `node`.
- Bash и `curl`.
- `pkexec` для управления JS через веб-панель либо `sudo` для ручной установки.

#### Windows

- Vivaldi Desktop, установленный для текущего пользователя или в Program Files.
- Node.js, доступный командой `node`.
- Windows PowerShell 5.1 или новее.

### Первоначальная настройка CSS в Vivaldi

1. Откройте `vivaldi://experiments`.
2. Включите **Allow for using CSS modifications**.
3. Откройте **Настройки → Внешний вид → Пользовательские изменения интерфейса**.
4. Выберите каталог `vivaldi-mods/css/custom`.
5. После изменения набора активных CSS-файлов перезапускайте Vivaldi.

В текущей установке Linux старый путь `~/vivaldi-css-mods` является символической ссылкой на этот каталог.
Linux-запускатель автоматически обновляет эту совместимую ссылку после перемещения каталога проекта.

### Запуск в Linux

Один раз установите переносимую команду:

```bash
./install-portable-launcher.sh
```

После этого менеджер можно запускать из любого текущего каталога либо через меню приложений:

```bash
vivaldi-mod-manager
```

Команда хранит стабильную регистрацию текущего расположения проекта. Если проект снова переместить внутри домашнего каталога, запускатель найдёт его и автоматически восстановит регистрацию.

Прямой запуск из проекта также остаётся доступен:

```bash
./start-web-manager.sh
```

Поведение запускателя:

- Если сервер выключен, он запускается в фоне и открывается вкладка Vivaldi.
- Если сервер уже работает, открывается только новая вкладка менеджера.
- Терминал можно закрыть сразу после запуска.
- Сервер завершается через пять секунд после закрытия последней вкладки менеджера.
- Обычное обновление страницы не останавливает сервер.

Также доступно консольное управление:

```bash
./manage.sh list
./manage.sh enable-css compact-tabs
./manage.sh disable-css compact-tabs
./manage.sh js-status
./manage.sh install-tab-colors
./manage.sh uninstall-tab-colors
```

### Запуск в Windows

1. Скопируйте весь каталог `vivaldi-mods` на Windows.
2. Установите Node.js и проверьте работу команды `node`.
3. Дважды щёлкните `start-web-manager.bat`.

BAT-файл вызывает `start-web-manager.ps1`. При необходимости сервер запускается скрыто в фоне, после чего в Vivaldi открывается `http://127.0.0.1:43777`. Для операций с JS-модами Windows показывает стандартное окно подтверждения прав администратора.

### Куда помещать моды

#### CSS-моды

Помещайте CSS-файлы в:

```text
vivaldi-mods/css/custom/
```

- `example.css` — включён.
- `example.css.off` — выключен.
- Новый CSS можно создать кнопкой **+ Новый CSS** в веб-панели. Он будет изначально выключен.
- Первый комментарий `/* ... */` используется в качестве описания мода.

#### JavaScript-моды

Каждый JS-мод должен находиться в отдельной папке:

```text
vivaldi-mods/js/<идентификатор-мода>/
```

JS-моды Vivaldi не являются обычными браузерными расширениями. Они изменяют файлы установки Vivaldi, поэтому им нужны платформенные установщики, повышение прав и интеграция с менеджером. Сейчас полностью интегрирован `js/tab-colors`; простое копирование произвольного `.js` в каталог `js/` не установит его и не добавит в панель автоматически.

### Использование tab-colors

1. Установите или включите `tab-colors` через веб-панель.
2. Полностью перезапустите Vivaldi.
3. Зажмите `Shift` и нажмите ПКМ по обычной вкладке.
4. Выберите готовый или произвольный цвет либо сбросьте цвет.

Безопасная текущая версия хранит назначенные цвета только до полного завершения сеанса Vivaldi. Обычное меню по ПКМ не изменяется.

Ручные команды Linux:

```bash
cd /путь/к/vivaldi-mod-manager/js/tab-colors
sudo ./install.sh
sudo ./disable.sh
sudo ./uninstall.sh
```

Для Windows имеются аналогичные `.ps1`-скрипты, которые обычно запускает веб-панель.

### Обновления Vivaldi

- Настройка CSS обычно сохраняется, но изменения селекторов интерфейса могут потребовать обновления CSS.
- Обновление Vivaldi может заменить `window.html` и удалить JS-инъекцию.
- Если для `tab-colors` отображается состояние **Есть обновление**, **Повреждён** или **Выключен**, используйте соответствующую кнопку восстановления или включения.
- Перед первой инъекцией установщик создаёт `window.html.user-tab-colors-backup`.

### Безопасность

- Сервер принимает соединения только на `127.0.0.1`.
- Изменяющие запросы принимаются только от страницы менеджера и в формате JSON.
- Имена модов ограничены строчными латинскими буквами, цифрами и дефисами.
- Удаляемые CSS перемещаются в восстанавливаемую локальную корзину.
- Сервер предоставляет только фиксированные привилегированные действия, а не произвольное выполнение команд.
- В Linux используется `pkexec`, в Windows — PowerShell с подтверждением прав администратора.

Перед добавлением стороннего CSS или JavaScript просматривайте его содержимое. JS-мод Vivaldi выполняется внутри интерфейса браузера, поэтому его следует считать доверенным локальным кодом.

### Решение проблем

- **Страница не открывается:** повторно запустите платформенный запускатель и проверьте файлы в `web-manager/runtime/`.
- **CSS не применяется:** проверьте выбранный каталог пользовательского CSS и перезапустите Vivaldi.
- **Операция с JS отменяется:** подтвердите запрос polkit в Linux или права администратора в Windows.
- **Менеджер сообщает о повреждении JS:** выполните **Переустановить**, затем перезапустите Vivaldi.
- **Порт 43777 занят:** остановите другой процесс, использующий этот порт.

### Проверки для разработки

```bash
node --check web-manager/server.js
node --check web-manager/public/app.js
bash -n manage.sh start-web-manager.sh js/tab-colors/*.sh
```

Временные файлы и персональный журнал действий исключены из Git через `.gitignore`.

### Создание собственных модов

Соглашения CSS и JavaScript, требования к безопасным установщикам, интеграция с менеджером, тестирование и проверка перед коммитом описаны в [docs/MODDING.md](docs/MODDING.md).
