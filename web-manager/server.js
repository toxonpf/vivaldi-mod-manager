#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const cssDir = path.join(root, 'css', 'custom');
const trashDir = path.join(root, 'trash');
const tabColors = path.join(root, 'js', 'tab-colors');
const publicDir = path.join(__dirname, 'public');
const activityFile = path.join(__dirname, 'activity.json');
const host = '127.0.0.1';
const port = 43777;
const origin = `http://${host}:${port}`;
const clients = new Map();
let hadClients = false;
let shutdownTimer = null;

function detectVivaldi() {
  if (process.platform !== 'win32') {
    return {
      executable: '/opt/vivaldi/vivaldi',
      windowHtml: '/opt/vivaldi/resources/vivaldi/window.html',
      version: null,
    };
  }
  const roots = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Vivaldi', 'Application'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Vivaldi', 'Application'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Vivaldi', 'Application'),
  ].filter(Boolean);
  for (const application of roots) {
    if (!fs.existsSync(application)) continue;
    const direct = path.join(application, 'resources', 'vivaldi', 'window.html');
    if (fs.existsSync(direct)) {
      return { executable: path.join(application, 'vivaldi.exe'), windowHtml: direct, version: null };
    }
    const versions = fs.readdirSync(application, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+(?:\.\d+)+$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const version of versions) {
      const candidate = path.join(application, version, 'resources', 'vivaldi', 'window.html');
      if (fs.existsSync(candidate)) {
        return { executable: path.join(application, 'vivaldi.exe'), windowHtml: candidate, version };
      }
    }
  }
  return { executable: null, windowHtml: null, version: null };
}

const vivaldi = detectVivaldi();
const windowHtml = vivaldi.windowHtml;
const installedTabColors = windowHtml ? path.join(path.dirname(windowHtml), 'user-tab-colors') : null;

fs.mkdirSync(trashDir, { recursive: true });

function validName(name) {
  return typeof name === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(name);
}

function validClientId(id) {
  return typeof id === 'string' && /^[a-f0-9-]{20,64}$/i.test(id);
}

function cancelShutdown() {
  if (shutdownTimer) clearTimeout(shutdownTimer);
  shutdownTimer = null;
}

function scheduleShutdown() {
  if (!hadClients || clients.size || shutdownTimer) return;
  shutdownTimer = setTimeout(() => {
    console.log('Последняя вкладка менеджера закрыта. Сервер остановлен.');
    process.exit(0);
  }, 5000);
}

function touchClient(id) {
  if (!validClientId(id)) return false;
  clients.set(id, Date.now());
  hadClients = true;
  cancelShutdown();
  return true;
}

setInterval(() => {
  const staleBefore = Date.now() - 90000;
  for (const [id, lastSeen] of clients) if (lastSeen < staleBefore) clients.delete(id);
  scheduleShutdown();
}, 15000).unref();

function cssPath(name) {
  const enabled = path.join(cssDir, `${name}.css`);
  const disabled = path.join(cssDir, `${name}.css.off`);
  if (fs.existsSync(enabled)) return { file: enabled, enabled: true };
  if (fs.existsSync(disabled)) return { file: disabled, enabled: false };
  return null;
}

function toggleCss(name, enable) {
  const entry = cssPath(name);
  if (!entry) return { code: 1, output: `CSS-мод '${name}' не найден.` };
  if (entry.enabled === enable) return { code: 0, output: `CSS-мод '${name}' уже ${enable ? 'включён' : 'выключен'}.` };
  const destination = path.join(cssDir, `${name}.css${enable ? '' : '.off'}`);
  fs.renameSync(entry.file, destination);
  return { code: 0, output: `${enable ? 'Включён' : 'Выключен'} '${name}'. Перезапустите Vivaldi.` };
}

function description(content) {
  const match = content.match(/^\s*\/\*\s*([^*]+?)\s*\*\//s);
  return match ? match[1].replace(/\s+/g, ' ').trim() : 'Пользовательский CSS-мод';
}

function hash(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readActivity() {
  try { return JSON.parse(fs.readFileSync(activityFile, 'utf8')); } catch { return []; }
}

function log(action, result = 'ok') {
  const items = readActivity();
  items.unshift({ time: new Date().toISOString(), action, result });
  fs.writeFileSync(activityFile, JSON.stringify(items.slice(0, 30), null, 2));
}

function vivaldiVersion() {
  // On Windows, starting vivaldi.exe with --version is not a side-effect-free
  // query: it can open a browser window. The manager polls /api/status, so doing
  // that here used to create an endless open/close loop. The installation's
  // version directory already contains the version we need.
  if (process.platform === 'win32') {
    return vivaldi.version ? `Vivaldi ${vivaldi.version}` : 'Vivaldi: версия не определена';
  }
  try {
    if (!vivaldi.executable) throw new Error('not found');
    return execFileSync(vivaldi.executable, ['--version'], { encoding: 'utf8', timeout: 3000 }).trim();
  }
  catch { return 'Vivaldi: версия не определена'; }
}

// Version detection must not launch a process for every status refresh.
const detectedVivaldiVersion = vivaldiVersion();

function tabColorsStatus() {
  const enabled = Boolean(windowHtml && fs.existsSync(windowHtml) && fs.readFileSync(windowHtml, 'utf8').includes('<!-- user-tab-colors-mod -->'));
  const filesPresent = Boolean(installedTabColors && fs.existsSync(path.join(installedTabColors, 'tab-colors.js')) && fs.existsSync(path.join(installedTabColors, 'tab-colors.css')));
  const updateAvailable = filesPresent && (
    hash(path.join(tabColors, 'tab-colors.js')) !== hash(path.join(installedTabColors, 'tab-colors.js')) ||
    hash(path.join(tabColors, 'tab-colors.css')) !== hash(path.join(installedTabColors, 'tab-colors.css'))
  );
  return { installed: filesPresent, enabled, filesPresent, updateAvailable, healthy: enabled && filesPresent && !updateAvailable };
}

function runElevated(script, callback) {
  if (process.platform !== 'win32') return run('pkexec', [script], callback);
  const argumentLine = `-NoProfile -ExecutionPolicy Bypass -File "${script.replace(/"/g, '`"')}"`.replace(/'/g, "''");
  const command = `$p=Start-Process -FilePath 'powershell.exe' -ArgumentList '${argumentLine}' -Verb RunAs -Wait -PassThru; exit $p.ExitCode`;
  run('powershell.exe', ['-NoProfile', '-Command', command], callback);
}

function status() {
  const css = fs.readdirSync(cssDir)
    .filter((name) => name.endsWith('.css') || name.endsWith('.css.off'))
    .sort()
    .map((fileName) => {
      const content = fs.readFileSync(path.join(cssDir, fileName), 'utf8');
      return {
        name: fileName.replace(/\.css(?:\.off)?$/, ''),
        enabled: fileName.endsWith('.css'),
        description: description(content),
        bytes: Buffer.byteLength(content),
      };
    });
  const trash = fs.readdirSync(trashDir).filter((name) => /^\d+--[a-z0-9-]+\.css(?:\.off)?$/.test(name)).sort().reverse();
  return { version: detectedVivaldiVersion, css, js: { tabColors: tabColorsStatus() }, trash, activity: readActivity().slice(0, 10) };
}

function send(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}

function sendResult(response, code, output) {
  send(response, code, { ok: code < 400, output, status: status() });
}

function readJson(request, response, callback) {
  if (request.headers.origin !== origin || !String(request.headers['content-type'] || '').startsWith('application/json')) {
    return send(response, 403, { error: 'Запрос отклонён.' });
  }
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 262144) request.destroy();
  });
  request.on('end', () => {
    try { callback(JSON.parse(body || '{}')); }
    catch { send(response, 400, { error: 'Некорректный JSON.' }); }
  });
}

function run(command, args, callback) {
  const child = spawn(command, args, { cwd: root });
  let output = '';
  let finished = false;
  const done = (code, text) => {
    if (finished) return;
    finished = true;
    callback(code, text);
  };
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  child.on('error', (error) => done(1, error.message));
  child.on('close', (code) => done(code, output.trim()));
}

function serveFile(response, file) {
  const fullPath = path.join(publicDir, file);
  if (!fullPath.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(fullPath)) return send(response, 404, { error: 'Не найдено.' });
  const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
  response.writeHead(200, {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(fs.readFileSync(fullPath));
}

http.createServer((request, response) => {
  const url = new URL(request.url, origin);
  if (request.method === 'GET' && url.pathname === '/api/status') return send(response, 200, status());
  if (request.method === 'GET' && url.pathname === '/') return serveFile(response, 'index.html');
  if (request.method === 'GET' && url.pathname === '/app.css') return serveFile(response, 'app.css');
  if (request.method === 'GET' && url.pathname === '/app.js') return serveFile(response, 'app.js');

  const clientMatch = url.pathname.match(/^\/api\/client\/(connect|heartbeat|disconnect)$/);
  if (request.method === 'POST' && clientMatch) {
    return readJson(request, response, (body) => {
      if (!validClientId(body.id)) return send(response, 400, { error: 'Некорректный идентификатор вкладки.' });
      if (clientMatch[1] === 'disconnect') {
        clients.delete(body.id);
        scheduleShutdown();
      } else {
        touchClient(body.id);
      }
      send(response, 200, { ok: true, clients: clients.size });
    });
  }

  const readCssMatch = url.pathname.match(/^\/api\/css\/([a-z0-9-]+)$/);
  if (request.method === 'GET' && readCssMatch) {
    const entry = cssPath(readCssMatch[1]);
    return entry ? send(response, 200, { name: readCssMatch[1], enabled: entry.enabled, content: fs.readFileSync(entry.file, 'utf8') }) : send(response, 404, { error: 'Мод не найден.' });
  }

  const cssToggleMatch = url.pathname.match(/^\/api\/css\/([a-z0-9-]+)\/(enable|disable)$/);
  if (request.method === 'POST' && cssToggleMatch) {
    return readJson(request, response, () => {
      const result = toggleCss(cssToggleMatch[1], cssToggleMatch[2] === 'enable');
      log(`${cssToggleMatch[2] === 'enable' ? 'Включён' : 'Выключен'} CSS: ${cssToggleMatch[1]}`, result.code === 0 ? 'ok' : 'error');
      sendResult(response, result.code === 0 ? 200 : 400, result.output);
    });
  }

  const saveMatch = url.pathname.match(/^\/api\/css\/([a-z0-9-]+)\/save$/);
  if (request.method === 'POST' && saveMatch) {
    return readJson(request, response, (body) => {
      const entry = cssPath(saveMatch[1]);
      if (!entry) return send(response, 404, { error: 'Мод не найден.' });
      if (typeof body.content !== 'string' || body.content.length > 200000) return send(response, 400, { error: 'Некорректное содержимое.' });
      const temporary = `${entry.file}.tmp`;
      fs.writeFileSync(temporary, body.content);
      fs.renameSync(temporary, entry.file);
      log(`Изменён CSS: ${saveMatch[1]}`);
      sendResult(response, 200, 'CSS-мод сохранён. Перезапустите Vivaldi.');
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/css/create') {
    return readJson(request, response, (body) => {
      if (!validName(body.name)) return send(response, 400, { error: 'Имя: латиница, цифры и дефисы, до 64 символов.' });
      if (cssPath(body.name)) return send(response, 409, { error: 'Мод с таким именем уже существует.' });
      if (typeof body.content !== 'string' || body.content.length > 200000) return send(response, 400, { error: 'Некорректное содержимое.' });
      fs.writeFileSync(path.join(cssDir, `${body.name}.css.off`), body.content);
      log(`Создан CSS: ${body.name}`);
      sendResult(response, 200, 'CSS-мод создан выключенным.');
    });
  }

  const deleteMatch = url.pathname.match(/^\/api\/css\/([a-z0-9-]+)\/delete$/);
  if (request.method === 'POST' && deleteMatch) {
    return readJson(request, response, () => {
      const entry = cssPath(deleteMatch[1]);
      if (!entry) return send(response, 404, { error: 'Мод не найден.' });
      const destination = path.join(trashDir, `${Date.now()}--${path.basename(entry.file)}`);
      fs.renameSync(entry.file, destination);
      log(`CSS перемещён в корзину: ${deleteMatch[1]}`);
      sendResult(response, 200, 'Мод перемещён в корзину.');
    });
  }

  const restoreMatch = url.pathname.match(/^\/api\/trash\/(\d+--[a-z0-9-]+\.css(?:\.off)?)\/restore$/);
  if (request.method === 'POST' && restoreMatch) {
    return readJson(request, response, () => {
      const source = path.join(trashDir, restoreMatch[1]);
      const original = restoreMatch[1].replace(/^\d+--/, '');
      const name = original.replace(/\.css(?:\.off)?$/, '');
      if (!fs.existsSync(source)) return send(response, 404, { error: 'Файл в корзине не найден.' });
      if (cssPath(name)) return send(response, 409, { error: 'Мод с таким именем уже существует.' });
      fs.renameSync(source, path.join(cssDir, original));
      log(`CSS восстановлен: ${name}`);
      sendResult(response, 200, 'Мод восстановлен.');
    });
  }

  const jsMatch = url.pathname.match(/^\/api\/js\/tab-colors\/(install|uninstall)$/);
  if (request.method === 'POST' && jsMatch) {
    return readJson(request, response, () => {
      const suffix = process.platform === 'win32' ? '.ps1' : '.sh';
      const script = path.join(tabColors, `${jsMatch[1] === 'install' ? 'install' : 'uninstall'}${suffix}`);
      runElevated(script, (code, output) => {
        log(`${jsMatch[1] === 'install' ? 'Установлен/обновлён' : 'Удалён'} JS: tab-colors`, code === 0 ? 'ok' : 'error');
        const fallback = code === 0
          ? `JS-мод ${jsMatch[1] === 'install' ? 'установлен/обновлён' : 'удалён'}. Перезапустите Vivaldi.`
          : 'Действие не выполнено. Подтвердите запрос прав администратора Windows и повторите.';
        sendResult(response, code === 0 ? 200 : 400, output || fallback);
      });
    });
  }

  const jsControlMatch = url.pathname.match(/^\/api\/js\/tab-colors\/(enable|disable|repair)$/);
  if (request.method === 'POST' && jsControlMatch) {
    return readJson(request, response, () => {
      const suffix = process.platform === 'win32' ? '.ps1' : '.sh';
      const scripts = {
        enable: path.join(tabColors, `install${suffix}`),
        disable: path.join(tabColors, `disable${suffix}`),
        repair: path.join(tabColors, `install${suffix}`),
      };
      runElevated(scripts[jsControlMatch[1]], (code, output) => {
        const labels = { enable: 'Включён', disable: 'Выключен', repair: 'Переустановлен' };
        log(`${labels[jsControlMatch[1]]} JS: tab-colors`, code === 0 ? 'ok' : 'error');
        const fallback = code === 0
          ? `JS-мод ${labels[jsControlMatch[1]].toLowerCase()}. Перезапустите Vivaldi.`
          : 'Действие не выполнено. Подтвердите запрос прав администратора Windows и повторите.';
        sendResult(response, code === 0 ? 200 : 400, output || fallback);
      });
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/js/tab-colors/source') {
    return send(response, 200, {
      javascript: fs.readFileSync(path.join(tabColors, 'tab-colors.js'), 'utf8'),
      css: fs.readFileSync(path.join(tabColors, 'tab-colors.css'), 'utf8'),
    });
  }

  send(response, 404, { error: 'Не найдено.' });
}).listen(port, host, () => {
  console.log(`Vivaldi Mod Manager: ${origin}`);
});
