const math = require('mathjs');
const { ipcRenderer } = require('electron');

let tabs = [{ name: 'Tab 1', lines: [''] }];
let currentTab = 0;
let lastKey = '';

const container = document.getElementById('container');
const tabBtn = document.getElementById('tab-btn');
const settingsBtn = document.getElementById('settings-btn');
const tabMenu = document.getElementById('tab-menu');
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');
const settingsView = document.getElementById('settings');
const themeSelect = document.getElementById('theme-select');
const gradientSelect = document.getElementById('gradient-select');
const sizeSelect = document.getElementById('size-select');
const fontSizeInput = document.getElementById('font-size');

document.body.classList.add('dark');

minBtn.addEventListener('click', () => ipcRenderer.send('window:minimize'));
maxBtn.addEventListener('click', () => ipcRenderer.send('window:maximize'));
closeBtn.addEventListener('click', () => ipcRenderer.send('window:close'));

const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP' };

function formatNumber(num, sym, force = true) {
  try {
    if (sym && currencyMap[sym]) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyMap[sym],
        minimumFractionDigits: force ? 2 : 0,
        maximumFractionDigits: force ? 2 : 0
      }).format(num);
    }
    return new Intl.NumberFormat().format(num);
  } catch {
    return num.toString();
  }
}

function highlight(text) {
  return text.replace(/([$€£]?\d+(?:\.\d+)?%?)/g, (match) => {
    if (match.endsWith('%')) {
      const n = Number(match.slice(0, -1));
      return `<span class="percent">${formatNumber(n)}%</span>`;
    }
    const sym = match[0];
    if (currencyMap[sym]) {
      const hasDec = match.includes('.');
      const n = Number(match.slice(1));
      return `<span class="currency">${formatNumber(n, sym, hasDec)}</span>`;
    }
    const n = Number(match);
    return `<span class="number">${formatNumber(n)}</span>`;
  });
}

function compute(text) {
  if (!text.trim()) return '';
  const currencyMatch = text.match(/[$€£]/);
  let expr = text
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    .replace(/[$€£]/g, '')
    .replace(/,/g, '');
  try {
    const res = math.evaluate(expr);
    if (typeof res === 'number') {
      return formatNumber(res, currencyMatch ? currencyMatch[0] : null);
    }
    return '';
  } catch {
    return '';
  }
}

function renderTab() {
  container.innerHTML = '';
  const lines = tabs[currentTab].lines;
  lines.forEach((text, index) => {
    const line = document.createElement('div');
    line.className = 'line';

    const expr = document.createElement('span');
    expr.className = 'expr';
    expr.contentEditable = true;
    expr.dataset.index = index;
    expr.innerHTML = highlight(text);
    expr.addEventListener('input', onInput);
    expr.addEventListener('keydown', onKey);

    const res = document.createElement('span');
    res.className = 'res answer';
    const result = compute(text);
    res.textContent = result;
    res.dataset.full = result;
    res.addEventListener('click', () => {
      navigator.clipboard.writeText(res.dataset.full || '');
    });

    line.appendChild(expr);
    line.appendChild(res);
    container.appendChild(line);
  });
}

function onInput(e) {
  const index = Number(e.target.dataset.index);
  let raw = e.target.innerText.replace(/,/g, '');
  if (lastKey && (lastKey === ' ' || '+-*/'.includes(lastKey))) {
    raw = raw.replace(/([$€£]\d+)(?!\.\d)/g, '$1.00');
  }
  raw = raw.replace(/([$€£])(\d+)(?:\.(\d{2}))?(\d*)/g, (_, sym, intp, dec = '', extra = '') => {
    if (dec === '00' && extra) {
      intp += extra;
      dec = '';
    } else {
      dec += extra;
    }
    return sym + intp + (dec ? '.' + dec : '');
  });
  lastKey = '';
  tabs[currentTab].lines[index] = raw;
  e.target.innerHTML = highlight(raw);
  placeCaretAtEnd(e.target);
  const result = compute(raw);
  const res = e.target.parentNode.querySelector('.res');
  res.textContent = result;
  res.dataset.full = result;
}

function onKey(e) {
  lastKey = e.key;
  const index = Number(e.target.dataset.index);
  if (e.key === 'Enter') {
    e.preventDefault();
    tabs[currentTab].lines.splice(index + 1, 0, '');
    renderTab();
    const next = container.querySelector(`.expr[data-index="${index + 1}"]`);
    next.focus();
  } else if (e.key === 'Backspace' && e.target.innerText === '' && index > 0) {
    e.preventDefault();
    tabs[currentTab].lines.splice(index, 1);
    renderTab();
    const prev = container.querySelector(`.expr[data-index="${index - 1}"]`);
    prev.focus();
  }
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function renderTabMenu() {
  tabMenu.innerHTML = '';
  tabs.forEach((t, idx) => {
    const item = document.createElement('div');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tab-name';
    nameSpan.textContent = t.name || `Tab ${idx + 1}`;
    nameSpan.addEventListener('click', () => {
      currentTab = idx;
      tabMenu.classList.add('hidden');
      renderTab();
    });
      const edit = document.createElement('span');
      edit.className = 'tab-edit';
      edit.textContent = '✎';
      edit.addEventListener('click', (e) => {
        e.stopPropagation();
        nameSpan.contentEditable = true;
        nameSpan.focus();
        document.execCommand('selectAll', false, null);
        const finish = () => {
          nameSpan.contentEditable = false;
          t.name = nameSpan.textContent.trim() || `Tab ${idx + 1}`;
          renderTabMenu();
        };
        nameSpan.addEventListener('blur', finish, { once: true });
        nameSpan.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            finish();
          }
        });
      });
    const del = document.createElement('span');
    del.className = 'tab-delete';
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (tabs.length > 1) {
        tabs.splice(idx, 1);
        if (currentTab >= tabs.length) currentTab = tabs.length - 1;
        renderTab();
        renderTabMenu();
      }
    });
    item.appendChild(nameSpan);
    item.appendChild(edit);
    item.appendChild(del);
    tabMenu.appendChild(item);
  });
  const newItem = document.createElement('div');
  newItem.textContent = 'New Tab';
  newItem.addEventListener('click', () => {
    tabs.push({ name: `Tab ${tabs.length + 1}`, lines: [''] });
    currentTab = tabs.length - 1;
    tabMenu.classList.add('hidden');
    renderTab();
  });
  tabMenu.appendChild(newItem);
}

tabBtn.addEventListener('click', () => {
  tabMenu.classList.toggle('hidden');
  renderTabMenu();
});

settingsBtn.addEventListener('click', () => {
  const showing = !settingsView.classList.toggle('hidden');
  container.classList.toggle('hidden', showing);
});

themeSelect.addEventListener('change', (e) => {
  document.body.classList.remove('light', 'dark');
  if (e.target.value === 'light') document.body.classList.add('light');
  else document.body.classList.add('dark');
  ipcRenderer.send('theme', e.target.value);
});

gradientSelect.addEventListener('change', (e) => {
  const [c1, c2] = e.target.value.split(',');
  document.body.style.setProperty('--grad1', c1);
  document.body.style.setProperty('--grad2', c2);
});

sizeSelect.addEventListener('change', (e) => {
  const [w, h] = e.target.value.split(',').map(Number);
  ipcRenderer.send('window:resize', { width: w, height: h });
});

fontSizeInput.addEventListener('change', (e) => {
  const size = Number(e.target.value) || 16;
  document.body.style.fontSize = size + 'px';
});

renderTab();
