/*
 * Vivaldi: individual tab colours (safe/minimal edition)
 *
 * Shift + right-click a tab to choose a colour. Normal right-click is not
 * changed. Colours intentionally live only for the current browser session:
 * this avoids touching Vivaldi's internal tab/session state.
 */
(() => {
  'use strict';

  const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  let menu;
  let selectedTab;

  function closeMenu() {
    if (menu) menu.remove();
    menu = undefined;
    selectedTab = undefined;
  }

  function paint(tab, colour) {
    tab.dataset.manualTabColour = colour;
    tab.style.setProperty('--manual-tab-colour', colour);
  }

  function reset(tab) {
    delete tab.dataset.manualTabColour;
    tab.style.removeProperty('--manual-tab-colour');
  }

  function choose(colour) {
    if (selectedTab) paint(selectedTab, colour);
    closeMenu();
  }

  function makeButton(colour) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'manual-tab-colour-swatch';
    button.style.backgroundColor = colour;
    button.title = colour;
    button.addEventListener('click', () => choose(colour));
    return button;
  }

  function openMenu(event, tab) {
    closeMenu();
    selectedTab = tab;
    menu = document.createElement('section');
    menu.className = 'manual-tab-colour-menu';

    const label = document.createElement('strong');
    label.className = 'manual-tab-colour-title';
    label.textContent = 'Цвет вкладки';
    menu.append(label);
    PALETTE.forEach((colour) => menu.append(makeButton(colour)));

    const custom = document.createElement('input');
    custom.type = 'color';
    custom.className = 'manual-tab-colour-custom';
    custom.value = tab.dataset.manualTabColour || '#3b82f6';
    custom.title = 'Выбрать любой цвет';
    custom.addEventListener('change', () => choose(custom.value));
    menu.append(custom);

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'manual-tab-colour-clear';
    clear.textContent = 'Сбросить цвет';
    clear.addEventListener('click', () => {
      if (selectedTab) reset(selectedTab);
      closeMenu();
    });
    menu.append(clear);

    document.body.append(menu);
    const padding = 10;
    menu.style.left = `${Math.max(padding, Math.min(event.clientX, innerWidth - menu.offsetWidth - padding))}px`;
    menu.style.top = `${Math.max(padding, Math.min(event.clientY, innerHeight - menu.offsetHeight - padding))}px`;
  }

  function initialise() {
    document.addEventListener('contextmenu', (event) => {
      if (!event.shiftKey || !(event.target instanceof Element)) return;
      const tab = event.target.closest('#tabs-container .tab');
      if (!tab) return;
      event.preventDefault();
      event.stopPropagation();
      openMenu(event, tab);
    }, true);

    document.addEventListener('pointerdown', (event) => {
      if (menu && !menu.contains(event.target)) closeMenu();
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  // Vivaldi builds its React UI after window.html has loaded. Waiting prevents
  // the mod from participating in its initial render.
  window.setTimeout(initialise, 1500);
})();
