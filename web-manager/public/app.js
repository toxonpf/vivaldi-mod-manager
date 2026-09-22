'use strict';

const clientId = crypto.randomUUID();
const elements = Object.fromEntries(['css', 'js', 'trash', 'trash-section', 'activity', 'output', 'summary', 'version', 'search', 'filter', 'editor', 'editor-form', 'editor-title', 'mod-name', 'mod-content', 'save', 'create', 'refresh', 'source-viewer', 'source-code', 'show-js', 'show-css', 'copy-source'].map((id) => [id, document.getElementById(id)]));
let currentStatus;
let editingName = null;
let tabColorSources = null;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, handler, kind = '') {
  const node = make('button', kind, label);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.output || 'Не удалось выполнить действие.');
  return data;
}

function clientSignal(action, keepalive = false) {
  return fetch(`/api/client/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: clientId }),
    keepalive,
  }).catch(() => {});
}

async function action(url, message = 'Выполняется…') {
  elements.output.textContent = message;
  try {
    const data = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    elements.output.textContent = data.output || 'Готово.';
    render(data.status);
  } catch (error) {
    elements.output.textContent = error.message;
  }
}

function stateLabel(enabled, customText) {
  return make('span', `state ${enabled ? 'on' : 'off'}`, customText || (enabled ? 'Включён' : 'Выключен'));
}

function cssCard(mod) {
  const card = make('article', 'card');
  const info = make('div', 'card-info');
  info.append(make('strong', '', mod.name), make('p', '', mod.description), make('small', '', `${mod.bytes} байт`));
  const controls = make('div', 'controls');
  controls.append(
    stateLabel(mod.enabled),
    button('Изменить', () => openEditor(mod.name), 'secondary'),
    button(mod.enabled ? 'Выключить' : 'Включить', () => action(`/api/css/${mod.name}/${mod.enabled ? 'disable' : 'enable'}`), mod.enabled ? 'secondary' : ''),
    button('В корзину', () => removeCss(mod.name), 'icon danger')
  );
  card.append(info, controls);
  return card;
}

function renderCss() {
  const query = elements.search.value.trim().toLowerCase();
  const filter = elements.filter.value;
  const mods = currentStatus.css.filter((mod) => (!query || `${mod.name} ${mod.description}`.toLowerCase().includes(query)) && (filter === 'all' || (filter === 'on') === mod.enabled));
  elements.css.replaceChildren(...mods.map(cssCard));
  if (!mods.length) elements.css.append(make('p', 'empty', 'Ничего не найдено.'));
}

function jsCard(data) {
  const card = make('article', 'card');
  const info = make('div', 'card-info');
  info.append(make('strong', '', 'Ручная раскраска вкладок'), make('p', '', 'Палитра по Shift + ПКМ на отдельной вкладке.'));
  const controls = make('div', 'controls');
  let label = data.installed ? 'Установлен, выключен' : 'Не установлен';
  if (data.enabled && !data.filesPresent) label = 'Повреждён';
  else if (data.updateAvailable) label = 'Есть обновление';
  else if (data.healthy) label = 'Исправен';
  controls.append(stateLabel(data.healthy, label));
  controls.append(button('Код', openSourceViewer, 'secondary'));
  if (data.installed) {
    if (data.updateAvailable || (data.enabled && !data.healthy)) controls.append(button('Переустановить', () => action('/api/js/tab-colors/repair', 'Ожидается системное подтверждение…')));
    controls.append(data.enabled
      ? button('Выключить', () => action('/api/js/tab-colors/disable', 'Ожидается системное подтверждение…'), 'secondary')
      : button('Включить', () => action('/api/js/tab-colors/enable', 'Ожидается системное подтверждение…')));
    controls.append(button('Удалить', () => action('/api/js/tab-colors/uninstall', 'Ожидается системное подтверждение…'), 'danger'));
  } else {
    controls.append(button('Установить', () => action('/api/js/tab-colors/install', 'Ожидается системное подтверждение…')));
  }
  card.append(info, controls);
  return card;
}

async function openSourceViewer() {
  try {
    tabColorSources = await request('/api/js/tab-colors/source');
    showSource('javascript');
    elements['source-viewer'].showModal();
  } catch (error) { elements.output.textContent = error.message; }
}

function showSource(type) {
  elements['source-code'].value = tabColorSources[type];
  elements['show-js'].className = type === 'javascript' ? '' : 'secondary';
  elements['show-css'].className = type === 'css' ? '' : 'secondary';
}

function render(status) {
  currentStatus = status;
  elements.version.textContent = status.version;
  const enabled = status.css.filter((mod) => mod.enabled).length;
  elements.summary.replaceChildren(summaryItem(String(status.css.length), 'CSS-модов'), summaryItem(String(enabled), 'включено'), summaryItem(status.js.tabColors.healthy ? 'OK' : '—', 'JS-состояние'));
  renderCss();
  elements.js.replaceChildren(jsCard(status.js.tabColors));
  elements['trash-section'].hidden = status.trash.length === 0;
  elements.trash.replaceChildren(...status.trash.map(trashCard));
  elements.activity.replaceChildren(...status.activity.map(activityItem));
  if (!status.activity.length) elements.activity.append(make('p', 'empty', 'Действий пока нет.'));
}

function summaryItem(value, label) {
  const item = make('div', 'summary-item');
  item.append(make('strong', '', value), make('span', '', label));
  return item;
}

function trashCard(file) {
  const original = file.replace(/^\d+--/, '');
  const card = make('article', 'card');
  card.append(make('strong', '', original), button('Восстановить', () => action(`/api/trash/${encodeURIComponent(file)}/restore`), 'secondary'));
  return card;
}

function activityItem(item) {
  const row = make('div', 'activity-row');
  row.append(make('span', item.result === 'ok' ? 'activity-ok' : 'activity-error', item.result === 'ok' ? '●' : '×'), make('span', '', item.action), make('time', '', new Date(item.time).toLocaleString('ru-RU')));
  return row;
}

async function openEditor(name = null) {
  editingName = name;
  elements['editor-title'].textContent = name ? `Изменить ${name}` : 'Новый CSS-мод';
  elements['mod-name'].disabled = Boolean(name);
  if (name) {
    try {
      const data = await request(`/api/css/${name}`);
      elements['mod-name'].value = data.name;
      elements['mod-content'].value = data.content;
    } catch (error) { elements.output.textContent = error.message; return; }
  } else {
    elements['mod-name'].value = '';
    elements['mod-content'].value = '/* Опишите назначение мода здесь. */\n\n';
  }
  elements.editor.showModal();
}

async function saveEditor(event) {
  event.preventDefault();
  if (!elements['editor-form'].reportValidity()) return;
  const name = elements['mod-name'].value;
  const content = elements['mod-content'].value;
  try {
    const data = await request(editingName ? `/api/css/${editingName}/save` : '/api/css/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) });
    elements.editor.close();
    elements.output.textContent = data.output;
    render(data.status);
  } catch (error) { elements.output.textContent = error.message; }
}

function removeCss(name) {
  if (confirm(`Переместить CSS-мод «${name}» в корзину?`)) action(`/api/css/${name}/delete`);
}

async function refresh() {
  elements.output.textContent = 'Обновление…';
  try { render(await request('/api/status')); elements.output.textContent = ''; }
  catch (error) { elements.output.textContent = error.message; }
}

elements.search.addEventListener('input', renderCss);
elements.filter.addEventListener('change', renderCss);
elements.create.addEventListener('click', () => openEditor());
elements.refresh.addEventListener('click', refresh);
elements['editor-form'].addEventListener('submit', saveEditor);
document.querySelectorAll('[data-close]').forEach((node) => node.addEventListener('click', () => elements.editor.close()));
document.querySelectorAll('[data-close-source]').forEach((node) => node.addEventListener('click', () => elements['source-viewer'].close()));
elements['show-js'].addEventListener('click', () => showSource('javascript'));
elements['show-css'].addEventListener('click', () => showSource('css'));
elements['copy-source'].addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(elements['source-code'].value); elements.output.textContent = 'Исходник скопирован.'; }
  catch { elements.output.textContent = 'Не удалось скопировать исходник.'; }
});
clientSignal('connect');
setInterval(() => clientSignal('heartbeat'), 10000);
window.addEventListener('pagehide', () => clientSignal('disconnect', true));
refresh();
