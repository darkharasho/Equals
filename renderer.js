const math = require('mathjs');
const { ipcRenderer } = require('electron');

let tabs = [{ name: 'Tab 1', lines: [''] }];
let currentTab = 0;
let lineResults = [];
let lineMeta = [];
let vars = {};
let underlineEl = null;

function getCaret(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

function setCaret(el, pos) {
  const range = document.createRange();
  range.selectNodeContents(el);
  let stack = [el], node, offset = 0;
  while ((node = stack.pop())) {
    if (node.nodeType === 3) {
      const next = offset + node.length;
      if (pos <= next) {
        range.setStart(node, pos - offset);
        range.collapse(true);
        break;
      }
      offset = next;
    } else {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        stack.push(node.childNodes[i]);
      }
    }
  }
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

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
const versionEl = document.getElementById('version');
const toast = document.getElementById('toast');

function saveState() {
  const settings = {
    theme: themeSelect.value,
    gradient: gradientSelect.value,
    size: sizeSelect.value,
    fontSize: fontSizeInput.value
  };
  localStorage.setItem('equalsState', JSON.stringify({ tabs, currentTab, settings }));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('equalsState') || '{}');
    if (saved.tabs) tabs = saved.tabs;
    if (typeof saved.currentTab === 'number') currentTab = saved.currentTab;
    if (saved.settings) {
      themeSelect.value = saved.settings.theme || 'dark';
      gradientSelect.value = saved.settings.gradient || '#bb87f8,#7aa2f7';
      sizeSelect.value = (saved.settings.size && saved.settings.size.includes(',')) ? saved.settings.size : '250,250';
      fontSizeInput.value = saved.settings.fontSize || 16;
    }
  } catch {}
}

function applyTheme(theme) {
  document.body.classList.remove('light', 'dark');
  if (theme === 'light') document.body.classList.add('light');
  else document.body.classList.add('dark');
  ipcRenderer.send('theme', theme);
}

function applySettings() {
  applyTheme(themeSelect.value);
  const [c1, c2] = gradientSelect.value.split(',');
  document.body.style.setProperty('--grad1', c1);
  document.body.style.setProperty('--grad2', c2);
  const [w, h] = sizeSelect.value.split(',').map(Number);
  if (Number.isFinite(w) && Number.isFinite(h)) {
    ipcRenderer.send('window:resize', { width: w, height: h });
  }
  const size = Number(fontSizeInput.value) || 16;
  document.body.style.fontSize = size + 'px';
}

loadState();
applySettings();

ipcRenderer.invoke('app:version').then(v => {
  if (versionEl) versionEl.textContent = 'v' + v;
});

minBtn.addEventListener('click', () => ipcRenderer.send('window:minimize'));
maxBtn.addEventListener('click', () => ipcRenderer.send('window:maximize'));
closeBtn.addEventListener('click', () => ipcRenderer.send('window:close'));

const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP' };

function formatNumber(num, sym, decimals) {
  try {
    const options = {};
    if (sym && currencyMap[sym]) {
      options.style = 'currency';
      options.currency = currencyMap[sym];
    }
    if (typeof decimals === 'number') {
      options.minimumFractionDigits = decimals;
      options.maximumFractionDigits = decimals;
    }
    return new Intl.NumberFormat(undefined, options).format(num);
  } catch {
    return num.toString();
  }
}

function esc(str) {
  return str.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function findLastIndex(idx) {
  for (let i = idx - 1; i >= 0; i--) {
    const m = lineMeta[i];
    if (m && typeof m.value === 'number') return i;
  }
  return -1;
}

function highlight(text, idx = 0) {
  if (/^\s*#\s/.test(text)) {
    return `<span class="comment">${esc(text)}</span>`;
  }
  const safe = esc(text);
  const lastIdx = findLastIndex(idx);
  return safe.replace(/\$[a-zA-Z_]\w*|""|[$€£]?\d+(?:\.\d+)?%?/g, (match) => {
    if (match === '""') {
      return `<span class="last" data-ref="${lastIdx}">""</span>`;
    }
    if (match.startsWith('$') && isNaN(match[1])) {
      const name = match.slice(1);
      const ref = vars[name] ? vars[name].line : '';
      return `<span class="variable" data-ref="${ref}">${match}</span>`;
    }
    if (match.endsWith('%')) {
      const num = match.slice(0, -1);
      const decs = (num.split('.')[1] || '').length;
      const n = Number(num);
      return `<span class="percent">${formatNumber(n, null, decs)}%</span>`;
    }
    const sym = match[0];
    if (currencyMap[sym] && /^\d/.test(match.slice(1))) {
      const num = match.slice(1);
      const decs = (num.split('.')[1] || '').length;
      const n = Number(num || 0);
      return `<span class="currency">${formatNumber(n, sym, decs)}</span>`;
    }
    const decs = (match.split('.')[1] || '').length;
    const n = Number(match);
    return `<span class="number">${formatNumber(n, null, decs)}</span>`;
  });
}

function compute(text, results, metas) {
  if (!text.trim() || /^\s*#\s/.test(text)) return { display: '', value: null, sym: null, decimals: undefined, assign: null };
  const assign = text.match(/^\s*\$([a-zA-Z_]\w*)\s*=\s*(.+)$/);
  let exprText = assign ? assign[2] : text;
  let sym = null;
  let decimals;
  exprText = exprText.replace(/([$€£])(?=\d)/g, m => { sym = sym || m; decimals = 2; return ''; });
  let last = null;
  for (let i = metas.length - 1; i >= 0; i--) {
    const m = metas[i];
    if (m && typeof m.value === 'number') { last = m; break; }
  }
  exprText = exprText
    .replace(/""/g, () => {
      if (!sym && last && last.sym) { sym = last.sym; decimals = last.decimals; }
      return last ? last.value : 0;
    })
    .replace(/\$([a-zA-Z_]\w*)/g, (_, n) => {
      const v = vars[n];
      if (v) {
        if (!sym && v.sym) { sym = v.sym; decimals = v.decimals; }
        return v.value;
      }
      return 0;
    })
    .replace(/([0-9.]+)\s*([+\-])\s*([0-9.]+)%/g, (_, a, op, b) => `${a}${op}${a}*(${b}/100)`)
    .replace(/([0-9.]+)\s*([*/])\s*([0-9.]+)%/g, (_, a, op, b) => `${a}${op}(${b}/100)`)
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    .replace(/,/g, '');
  try {
    const res = math.evaluate(exprText);
    if (typeof res === 'number') {
      const display = formatNumber(res, sym, sym ? 2 : decimals);
      return { display, value: res, sym, decimals: sym ? 2 : decimals, assign: assign ? assign[1] : null };
    }
    return { display: '', value: null, sym: null, decimals: undefined, assign: null };
  } catch {
    return { display: '', value: null, sym: null, decimals: undefined, assign: null };
  }
}

function recalc(focusIdx = null, caretPos = null) {
  const lines = tabs[currentTab].lines;
  lineResults = [];
  lineMeta = [];
  vars = {};
  lines.forEach((text, idx) => {
    const { display, value, sym, decimals, assign } = compute(text, lineResults, lineMeta);
    const resEl = container.querySelector(`.res[data-index="${idx}"]`);
    const exprEl = container.querySelector(`.expr[data-index="${idx}"]`);
    if (resEl) {
      resEl.textContent = display;
      resEl.dataset.full = display;
    }
    if (exprEl) {
      exprEl.innerHTML = highlight(text, idx);
      attachRefEvents(exprEl);
    }
    lineResults.push(value);
    lineMeta.push({ value, sym, decimals, display });
    if (assign) vars[assign] = { value, sym, decimals, display, line: idx };
  });
  if (focusIdx !== null && caretPos !== null) {
    const expr = container.querySelector(`.expr[data-index="${focusIdx}"]`);
    if (expr) setCaret(expr, caretPos);
  }
  updateDivider();
  saveState();
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1000);
}

function updateDivider() {
  const results = container.querySelectorAll('.res');
  if (results.length) {
    let minLeft = Infinity;
    results.forEach(r => {
      if (r.offsetLeft < minLeft) minLeft = r.offsetLeft;
    });
    container.style.setProperty('--divider-left', minLeft + 'px');
  }
}

function underlineResult(idx) {
  clearUnderline();
  const res = container.querySelector(`.res[data-index="${idx}"]`);
  if (res) {
    res.classList.add('underline');
    underlineEl = res;
  }
}

function clearUnderline() {
  if (underlineEl) {
    underlineEl.classList.remove('underline');
    underlineEl = null;
  }
}

function attachRefEvents(expr) {
  expr.querySelectorAll('.variable, .last').forEach(span => {
    span.addEventListener('mouseenter', () => {
      const ref = span.dataset.ref;
      if (ref !== '' && ref !== '-1') underlineResult(ref);
    });
    span.addEventListener('mouseleave', clearUnderline);
  });
}

document.addEventListener('selectionchange', () => {
  const sel = document.getSelection();
  if (!sel.rangeCount) { clearUnderline(); return; }
  const node = sel.anchorNode;
  let el = node ? (node.nodeType === 3 ? node.parentElement : node) : null;
  el = el ? el.closest('.variable, .last') : null;
  if (el && sel.isCollapsed) {
    const ref = el.dataset.ref;
    if (ref !== '' && ref !== '-1') underlineResult(ref);
  } else {
    clearUnderline();
  }
});

function renderTab() {
  container.innerHTML = '';
  const lines = tabs[currentTab].lines;
  lineResults = [];
  lineMeta = [];
  vars = {};
  lines.forEach((text, index) => {
    const { display, value, sym, decimals, assign } = compute(text, lineResults, lineMeta);
    lineResults.push(value);
    lineMeta.push({ value, sym, decimals, display });
    if (assign) vars[assign] = { value, sym, decimals, display, line: index };

    const line = document.createElement('div');
    line.className = 'line';
    line.dataset.index = index;

    const expr = document.createElement('span');
    expr.className = 'expr';
    expr.dataset.index = index;
    expr.contentEditable = 'true';
    expr.innerHTML = highlight(text, index);
    expr.addEventListener('input', onInput);
    expr.addEventListener('keydown', onKey);
    attachRefEvents(expr);

    const res = document.createElement('span');
    res.className = 'res answer';
    res.dataset.index = index;
    res.contentEditable = false;
    res.textContent = display;
    res.dataset.full = display;
    res.addEventListener('click', () => {
      navigator.clipboard.writeText(res.dataset.full || '');
      showToast('Copied');
    });

    line.appendChild(expr);
    line.appendChild(res);
    container.appendChild(line);
  });
  updateDivider();
  saveState();
}

function onInput(e) {
  let index = Number(e.target.dataset.index);
  const caret = getCaret(e.target);
  let raw = e.target.innerText.replace(/,/g, '');
  // constrain currency decimals without auto-appending values
  raw = raw.replace(/([$€£])(\d+)(\.?)(\d*)/g, (_, sym, intp, dot, dec) => {
    return sym + intp + (dot ? '.' + dec.slice(0, 2) : '');
  });
  tabs[currentTab].lines[index] = raw;
  recalc(index, caret);
}

function onKey(e) {
  const index = Number(e.target.dataset.index);
  if (e.key === 'Enter') {
    e.preventDefault();
    tabs[currentTab].lines.splice(index + 1, 0, '');
    renderTab();
    const next = container.querySelector(`.expr[data-index="${index + 1}"]`);
    next.focus();
  } else if (e.key === 'Backspace' && e.target.innerText === '') {
    e.preventDefault();
    if (tabs[currentTab].lines.length > 1) {
      tabs[currentTab].lines.splice(index, 1);
      renderTab();
      const prev = container.querySelector(`.expr[data-index="${Math.max(index - 1, 0)}"]`);
      if (prev) prev.focus();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = container.querySelector(`.expr[data-index="${index - 1}"]`);
    if (prev) {
      const pos = Math.min(getCaret(e.target), prev.innerText.length);
      prev.focus();
      setCaret(prev, pos);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = container.querySelector(`.expr[data-index="${index + 1}"]`);
    if (next) {
      const pos = Math.min(getCaret(e.target), next.innerText.length);
      next.focus();
      setCaret(next, pos);
    }
  }
  saveState();
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
      saveState();
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
          saveState();
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
        saveState();
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
    saveState();
  });
  tabMenu.appendChild(newItem);
}

tabBtn.addEventListener('click', () => {
  tabMenu.classList.toggle('hidden');
  renderTabMenu();
});

document.addEventListener('click', (e) => {
  if (!tabMenu.classList.contains('hidden') && !tabBtn.contains(e.target) && !tabMenu.contains(e.target)) {
    tabMenu.classList.add('hidden');
  }
});

settingsBtn.addEventListener('click', () => {
  const showing = !settingsView.classList.toggle('hidden');
  container.classList.toggle('hidden', showing);
  if (!showing) updateDivider();
});

themeSelect.addEventListener('change', (e) => {
  applyTheme(e.target.value);
  saveState();
});

gradientSelect.addEventListener('change', (e) => {
  const [c1, c2] = e.target.value.split(',');
  document.body.style.setProperty('--grad1', c1);
  document.body.style.setProperty('--grad2', c2);
  saveState();
});

sizeSelect.addEventListener('change', (e) => {
  const [w, h] = e.target.value.split(',').map(Number);
  if (Number.isFinite(w) && Number.isFinite(h)) {
    ipcRenderer.send('window:resize', { width: w, height: h });
    setTimeout(updateDivider, 100);
  }
  saveState();
});

fontSizeInput.addEventListener('change', (e) => {
  const size = Number(e.target.value) || 16;
  document.body.style.fontSize = size + 'px';
  updateDivider();
  saveState();
});

renderTab();
window.addEventListener('resize', updateDivider);
