const math = require('mathjs');
const { ipcRenderer } = require('electron');

let tabs = [{ name: 'Tab 1', lines: [''] }];
let currentTab = 0;
let lineResults = [];
let lineMeta = [];
let vars = {};
let underlineEl = null;

const helpers = {
  sum: (...args) => math.sum(...args),
  avg: (...args) => math.mean(...args),
  mean: (...args) => math.mean(...args),
  median: (...args) => math.median(...args),
  std: (...args) => math.std(...args)
};

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
const helpBtn = document.getElementById('help-btn');
const tabMenu = document.getElementById('tab-menu');
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');
const settingsView = document.getElementById('settings');
const themeSelect = document.getElementById('theme-select');
const gradientSelect = document.getElementById('gradient-select');
const gradientPreview = document.getElementById('gradient-preview');
const sizeSelect = document.getElementById('size-select');
const fontSizeInput = document.getElementById('font-size');
const angleModeSelect = document.getElementById('angle-mode');
const versionEl = document.getElementById('version');
const toast = document.getElementById('toast');

if (helpBtn) helpBtn.addEventListener('click', () => {
  ipcRenderer.send('help:open');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'F1') {
    e.preventDefault();
    ipcRenderer.send('help:open');
  }
});

function saveState() {
  const settings = {
    theme: themeSelect.value,
    gradient: gradientSelect.value,
    size: sizeSelect.value,
    fontSize: fontSizeInput.value,
    angleMode: angleModeSelect.value
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
      if (saved.settings.size && saved.settings.size.includes(',')) {
        sizeSelect.value = saved.settings.size;
      } else if (saved.settings.size === 'custom') {
        sizeSelect.value = 'custom';
      } else {
        sizeSelect.value = '250,250';
      }
      fontSizeInput.value = saved.settings.fontSize || 16;
      angleModeSelect.value = saved.settings.angleMode || 'deg';
    }
  } catch {}
}

function applyTheme(theme) {
  document.body.classList.remove('light', 'dark');
  if (theme === 'light') document.body.classList.add('light');
  else document.body.classList.add('dark');
  ipcRenderer.send('theme', theme);
}

function updateGradient(value) {
  const [c1, c2] = value.split(',');
  document.body.style.setProperty('--grad1', c1);
  document.body.style.setProperty('--grad2', c2);
  const grad = `linear-gradient(to right, ${c1}, ${c2})`;
  gradientSelect.style.backgroundImage = grad;
  gradientSelect.style.backgroundColor = 'var(--settings-bg)';
  gradientSelect.style.color = 'var(--text-color)';
  if (gradientPreview) gradientPreview.style.background = grad;
}

function applySettings() {
  applyTheme(themeSelect.value);
  updateGradient(gradientSelect.value);
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

[minBtn, maxBtn, closeBtn].forEach(btn => {
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btn.click();
    }
  });
});

const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP' };

function deg2rad(deg) { return deg * Math.PI / 180; }
function rad2deg(rad) { return rad * 180 / Math.PI; }

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

function formatRepeating(num) {
  try {
    const frac = math.fraction(num);
    let temp = Number(frac.d);
    while (temp % 2 === 0) temp /= 2;
    while (temp % 5 === 0) temp /= 5;
    if (temp === 1) return null;
    const sign = frac.s < 0 ? '-' : '';
    let n = Math.abs(Number(frac.n));
    const d = Number(frac.d);
    const intPart = Math.floor(n / d);
    let rem = n % d;
    const seen = {};
    const digits = [];
    let idx = 0;
    let repStart = -1;
    while (rem !== 0) {
      if (seen[rem] !== undefined) { repStart = seen[rem]; break; }
      seen[rem] = idx;
      rem *= 10;
      digits.push(Math.floor(rem / d));
      rem %= d;
      idx++;
    }
    if (repStart === -1) return null;
    const nonRep = digits.slice(0, repStart).join('');
    const rep = digits.slice(repStart).join('');
    const visible = 2;
    let first = '';
    if (nonRep.length >= visible) {
      first = nonRep.slice(0, visible);
    } else {
      first = nonRep;
      const need = visible - nonRep.length;
      const repNeeded = rep.repeat(Math.ceil(need / rep.length));
      first += repNeeded.slice(0, need);
    }
    const usedFromRep = Math.max(0, visible - nonRep.length);
    let leftover;
    if (rep.length > usedFromRep) {
      leftover = rep.slice(usedFromRep);
    } else {
      leftover = nonRep.length > 0 ? rep : '';
    }
    let dec = first;
    if (leftover) {
      dec += leftover.split('').map(d => d + '\u0305').join('');
    } else if (usedFromRep > 0) {
      const start = dec.length - usedFromRep;
      const prefix = dec.slice(0, start);
      const repShown = dec.slice(start).split('').map(d => d + '\u0305').join('');
      dec = prefix + repShown;
    }
    const intStr = formatNumber(intPart, null, 0);
    return sign + intStr + '.' + dec;
  } catch {
    return null;
  }
}

function timeToMinutes(str) {
  const m = str.match(/(\d{1,2}):(\d{2})(am|pm)?/i);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const period = m[3];
    if (period) {
      const p = period.toLowerCase();
      if (p === 'pm' && h < 12) h += 12;
      if (p === 'am' && h === 12) h = 0;
    }
    return h * 60 + min;
  }
  return 0;
}

function formatTimeOfDay(mins) {
  mins = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  let h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const period = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m.toString().padStart(2, '0')}${period}`;
}

function formatDuration(mins) {
  let total = Math.round(mins * 60);
  const sign = total < 0 ? -1 : 1;
  total = Math.abs(total);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h}hr`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  if (!parts.length) parts.push('0m');
  return (sign < 0 ? '-' : '') + parts.join(' ');
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dateToDays(d) {
  if (!(d instanceof Date)) d = new Date(d);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / MS_PER_DAY);
}

function daysToDate(days) {
  const d = new Date(days * MS_PER_DAY);
  return d.toISOString().slice(0, 10);
}

function formatDays(days) {
  const n = Math.round(days);
  return `${n} day${Math.abs(n) === 1 ? '' : 's'}`;
}

function replaceDateTokens(expr, state) {
  return expr
    .replace(/\btoday\b/gi, () => {
      state.dates++;
      return dateToDays(new Date());
    })
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (_, d) => {
      state.dates++;
      return dateToDays(d);
    })
    .replace(/(\d+)\s*(day|days|d)\b/gi, (_, n) => {
      state.durations++;
      return n;
    });
}

function replaceTimeTokens(expr, state) {
  return expr
    .replace(/\b(\d{1,2}:\d{2}(?:am|pm)?)\b/gi, (_, t) => {
      state.hasTime = true;
      state.hasTimeOfDay = true;
      return timeToMinutes(t);
    })
    .replace(/(\d+)\s*(hr|h|m|min|s|sec)\b/gi, (_, n, unit) => {
      state.hasTime = true;
      const num = Number(n);
      if (/^hr|h$/i.test(unit)) return num * 60;
      if (/^s|sec$/i.test(unit)) return num / 60;
      return num;
    });
}

function replaceUnitTokens(expr) {
  const map = { f: 'degF', c: 'degC', k: 'K' };
  return expr
    .replace(/(\d+(?:\.\d+)?)\s*(cm|mm|km|m|in|inch|ft|yd|mi|g|kg|mg|lb|oz|l|ml|gal|F|C|K)\b/gi, (_, n, u) => {
      const unit = map[u.toLowerCase()] || u.toLowerCase();
      return `unit(${n}, '${unit}')`;
    })
    .replace(/\b(F|C|K)\b/g, (m) => map[m.toLowerCase()] || m);
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

function expandRanges(expr, results, vars) {
  return expr
    .replace(/(\d+)\.\.(\d+)/g, (_, a, b) => {
      const start = Number(a), end = Number(b);
      const step = start <= end ? 1 : -1;
      const arr = [];
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        arr.push(i);
      }
      return `[${arr.join(',')}]`;
    })
    .replace(/\$([a-zA-Z_]\w*)\s*:\s*\$([a-zA-Z_]\w*)/g, (_, a, b) => {
      const keys = Object.keys(vars).sort();
      const start = keys.indexOf(a);
      const end = keys.indexOf(b);
      if (start === -1 || end === -1) return '[]';
      const [s, e] = start <= end ? [start, end] : [end, start];
      const arr = keys.slice(s, e + 1).map(k => vars[k].value);
      return `[${arr.join(',')}]`;
    })
    .replace(/(\d+)\s*:\s*(\d+)/g, (_, a, b) => {
      const start = Number(a), end = Number(b);
      const step = start <= end ? 1 : -1;
      const arr = [];
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        const v = results[i - 1];
        arr.push(typeof v === 'number' ? v : 0);
      }
      return `[${arr.join(',')}]`;
    });
}

function highlight(text, idx = 0) {
  if (/^\s*#\s/.test(text)) {
    return `<span class="comment">${esc(text)}</span>`;
  }
  const safe = esc(text);
  const lastIdx = findLastIndex(idx);
  return safe.replace(/\$[a-zA-Z_]\w*:\$[a-zA-Z_]\w*|\d+\.\.\d+|\$[a-zA-Z_]\w*|""|\d{1,2}:\d{2}(?:am|pm)?|\d{4}-\d{2}-\d{2}|\btoday\b|\d+\s*(?:day|days|d|hr|h|m|min|s|sec)|\b(?:asin|sin)\b|\d+(?:\.\d+)?\s*(?:cm|mm|km|m|in|inch|ft|yd|mi|g|kg|mg|lb|oz|l|ml|gal|F|C|K)|\b(?:cm|mm|km|m|in|inch|ft|yd|mi|g|kg|mg|lb|oz|l|ml|gal|F|C|K)\b|\d+:\d+|[$€£]?\d+(?:\.\d+)?%?/gi, (match) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(match) || /^today$/i.test(match)) {
      return `<span class="date">${match}</span>`;
    }
    if (/^\d+\s*(?:day|days|d)$/i.test(match)) {
      return `<span class="time">${match}</span>`;
    }
    if (/^(?:asin|sin)$/i.test(match)) {
      return `<span class="trig">${match}</span>`;
    }
    if (/^\d{1,2}:\d{2}(?:am|pm)?$/i.test(match) || /^\d+\s*(?:hr|h|m|min|s|sec)$/i.test(match)) {
      return `<span class="time">${match}</span>`;
    }
    if (/^\$[a-zA-Z_]\w*:\$[a-zA-Z_]\w*$/.test(match) || /^\d+\.\.\d+$/.test(match) || /^\d+:\d+$/.test(match)) {
      return `<span class="range">${match}</span>`;
    }
    if (/^\d+(?:\.\d+)?\s*(?:cm|mm|km|m|in|inch|ft|yd|mi|g|kg|mg|lb|oz|l|ml|gal|F|C|K)$/i.test(match) || /^(?:cm|mm|km|m|in|inch|ft|yd|mi|g|kg|mg|lb|oz|l|ml|gal|F|C|K)$/i.test(match)) {
      return `<span class="unit">${match}</span>`;
    }
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
  if (!text.trim() || /^\s*#\s/.test(text)) return { display: '', value: null, sym: null, decimals: undefined, assign: null, isTime: false, timeOfDay: false, isDate: false, isDay: false };
  const assign = text.match(/^\s*\$([a-zA-Z_]\w*)\s*=\s*([\s\S]+)$/);
  let exprText = (assign ? assign[2] : text).trim();
  let sym = null;
  let decimals;
  exprText = exprText.replace(/([$€£])(?=\d)/g, m => { sym = sym || m; decimals = 2; return ''; });
  exprText = exprText.replace(/,/g, '');
  let last = null;
  const timeState = { hasTime: false, hasTimeOfDay: false };
  const dateState = { dates: 0, durations: 0 };
  for (let i = metas.length - 1; i >= 0; i--) {
    const m = metas[i];
    if (m && typeof m.value === 'number') { last = m; break; }
  }
  exprText = expandRanges(exprText, results, vars)
    .replace(/""/g, () => {
      if (!sym && last && last.sym) { sym = last.sym; decimals = last.decimals; }
      if (last) {
        if (last.isTime) { timeState.hasTime = true; if (last.timeOfDay) timeState.hasTimeOfDay = true; }
        if (last.isDate) dateState.dates++;
        if (last.isDay) dateState.durations++;
      }
      return last ? last.value : 0;
    })
    .replace(/\$([a-zA-Z_]\w*)/g, (_, n) => {
      const v = vars[n];
      if (v) {
        if (!sym && v.sym) { sym = v.sym; decimals = v.decimals; }
        if (v.isTime) { timeState.hasTime = true; if (v.timeOfDay) timeState.hasTimeOfDay = true; }
        if (v.isDate) dateState.dates++;
        if (v.isDay) dateState.durations++;
        return v.value;
      }
      return 0;
    });

  exprText = replaceDateTokens(exprText, dateState);
  exprText = replaceTimeTokens(exprText, timeState)
    .replace(/([0-9.]+)\s*([+\-])\s*([0-9.]+)%/g, (_, a, op, b) => `${a}${op}${a}*(${b}/100)`)
    .replace(/([0-9.]+)\s*([*/])\s*([0-9.]+)%/g, (_, a, op, b) => `${a}${op}(${b}/100)`)
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  exprText = replaceUnitTokens(exprText);
  try {
    const useDeg = angleModeSelect.value === 'deg';
    const scope = { ...helpers };
    if (useDeg) {
      scope.sin = (x) => math.sin(deg2rad(x));
      scope.cos = (x) => math.cos(deg2rad(x));
      scope.tan = (x) => math.tan(deg2rad(x));
      scope.csc = (x) => 1 / math.sin(deg2rad(x));
      scope.sec = (x) => 1 / math.cos(deg2rad(x));
      scope.cot = (x) => 1 / math.tan(deg2rad(x));
      scope.asin = (x) => rad2deg(math.asin(x));
      scope.acos = (x) => rad2deg(math.acos(x));
      scope.atan = (x) => rad2deg(math.atan(x));
    }
    const res = math.evaluate(exprText, scope);
    if (res && res.isUnit) {
      const display = res.toString();
      return { display, value: res.toString(), sym: null, decimals: undefined, assign: assign ? assign[1] : null, isTime: false, timeOfDay: false, isDate: false, isDay: false };
    }
    if (typeof res === 'number') {
      if (dateState.dates || dateState.durations) {
        if (dateState.dates > 1 && dateState.durations === 0) {
          const display = formatDays(res);
          return { display, value: res, sym: null, decimals: undefined, assign: assign ? assign[1] : null, isTime: false, timeOfDay: false, isDate: false, isDay: true };
        }
        if (dateState.dates) {
          const display = daysToDate(res);
          return { display, value: res, sym: null, decimals: undefined, assign: assign ? assign[1] : null, isTime: false, timeOfDay: false, isDate: true, isDay: false };
        }
        const display = formatDays(res);
        return { display, value: res, sym: null, decimals: undefined, assign: assign ? assign[1] : null, isTime: false, timeOfDay: false, isDate: false, isDay: true };
      }
      if (timeState.hasTime) {
        if (timeState.hasTimeOfDay) {
          const display = formatTimeOfDay(res);
          return { display, value: res, sym: null, decimals: undefined, assign: assign ? assign[1] : null, isTime: true, timeOfDay: true, isDate: false, isDay: false };
        }
        const display = formatDuration(res);
        return { display, value: res, sym: null, decimals: undefined, assign: assign ? assign[1] : null, isTime: true, timeOfDay: false, isDate: false, isDay: false };
      }
      let display;
      if (!sym && decimals === undefined) {
        display = formatRepeating(res) || formatNumber(res, null, undefined);
      } else {
        display = formatNumber(res, sym, sym ? 2 : decimals);
      }
      return { display, value: res, sym, decimals: sym ? 2 : decimals, assign: assign ? assign[1] : null, isTime: false, timeOfDay: false, isDate: false, isDay: false };
    }
    return { display: '', value: null, sym: null, decimals: undefined, assign: null, isTime: false, timeOfDay: false, isDate: false, isDay: false };
  } catch {
    return { display: '', value: null, sym: null, decimals: undefined, assign: null, isTime: false, timeOfDay: false, isDate: false, isDay: false };
  }
}

function recalc(focusIdx = null, caretPos = null) {
  const lines = tabs[currentTab].lines;
  lineResults = [];
  lineMeta = [];
  vars = {};
  lines.forEach((text, idx) => {
    const { display, value, sym, decimals, assign, isTime, timeOfDay, isDate, isDay } = compute(text, lineResults, lineMeta);
    const resEl = container.querySelector(`.res[data-index="${idx}"]`);
    const exprEl = container.querySelector(`.expr[data-index="${idx}"]`);
    if (resEl) {
      resEl.textContent = display;
      resEl.dataset.full = display;
      resEl.className = `res ${isTime || isDay ? 'time' : isDate ? 'date' : 'answer'}`;
    }
    if (exprEl) {
      exprEl.innerHTML = highlight(text, idx);
      attachRefEvents(exprEl);
    }
    lineResults.push(value);
    lineMeta.push({ value, sym, decimals, display, isTime, timeOfDay, isDate, isDay });
    if (assign) vars[assign] = { value, sym, decimals, display, line: idx, isTime, timeOfDay, isDate, isDay };
  });
  if (focusIdx !== null && caretPos !== null) {
    const expr = container.querySelector(`.expr[data-index="${focusIdx}"]`);
    if (expr) setCaret(expr, caretPos);
  }
  updateDivider();
  clampScroll();
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

function clampScroll() {
  const max = Math.max(0, container.scrollHeight - container.clientHeight);
  if (container.scrollTop > max) container.scrollTop = max;
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
    const { display, value, sym, decimals, assign, isTime, timeOfDay, isDate, isDay } = compute(text, lineResults, lineMeta);
    lineResults.push(value);
    lineMeta.push({ value, sym, decimals, display, isTime, timeOfDay, isDate, isDay });
    if (assign) vars[assign] = { value, sym, decimals, display, line: index, isTime, timeOfDay, isDate, isDay };

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
    res.className = `res ${isTime || isDay ? 'time' : isDate ? 'date' : 'answer'}`;
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
  clampScroll();
  saveState();
}

function onInput(e) {
  let index = Number(e.target.dataset.index);
  let raw = (e.target.innerText || e.target.textContent || '').replace(/,/g, '');
  // constrain currency decimals without auto-appending values
  raw = raw.replace(/([$€£])(\d+)(\.?)(\d*)/g, (_, sym, intp, dot, dec) => {
    return sym + intp + (dot ? '.' + dec.slice(0, 2) : '');
  });
  // strip a trailing newline inserted by contentEditable
  raw = raw.replace(/\r?\n$/, '');
  const parts = raw.split(/\n/);
  if (parts.length > 1) {
    tabs[currentTab].lines.splice(index, 1, ...parts);
    renderTab();
    const targetIdx = index + parts.length - 1;
    const target = container.querySelector(`.expr[data-index="${targetIdx}"]`);
    if (target) {
      target.focus();
      setCaret(target, parts[parts.length - 1].length);
      target.scrollIntoView({ block: 'nearest' });
      clampScroll();
    }
  } else {
    const caret = getCaret(e.target);
    tabs[currentTab].lines[index] = raw;
    recalc(index, caret);
  }
}

function onKey(e) {
  const index = Number(e.target.dataset.index);
  if (e.key === 'Enter') {
    e.preventDefault();
    const caret = getCaret(e.target);
    const insertIdx = (caret === 0 && e.target.textContent !== '') ? index : index + 1;
    tabs[currentTab].lines.splice(insertIdx, 0, '');
    renderTab();
    const target = container.querySelector(`.expr[data-index="${insertIdx}"]`);
    if (target) {
      target.focus();
      setCaret(target, 0);
      target.scrollIntoView({ block: 'nearest' });
      clampScroll();
    }
  } else if (e.key === 'Backspace') {
    const caret = getCaret(e.target);
    if (caret === 0) {
      e.preventDefault();
      if (index > 0) {
        const curr = tabs[currentTab].lines[index];
        const prevText = tabs[currentTab].lines[index - 1];
        const newPos = prevText.length;
        tabs[currentTab].lines[index - 1] = prevText + curr;
        tabs[currentTab].lines.splice(index, 1);
        renderTab();
        const prev = container.querySelector(`.expr[data-index="${index - 1}"]`);
        if (prev) {
          prev.focus();
          setCaret(prev, newPos);
          prev.scrollIntoView({ block: 'nearest' });
          clampScroll();
        }
      }
    }
  } else if (e.key === 'Delete' && e.target.innerText === '') {
    e.preventDefault();
    if (tabs[currentTab].lines.length > 1) {
      tabs[currentTab].lines.splice(index, 1);
      renderTab();
      const prev = container.querySelector(`.expr[data-index="${Math.max(index - 1, 0)}"]`);
      if (prev) {
        prev.focus();
        setCaret(prev, prev.innerText.length);
        prev.scrollIntoView({ block: 'nearest' });
        clampScroll();
      }
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
      showToast(`Switched to ${tabs[currentTab].name}`);
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
    showToast(`Created ${tabs[currentTab].name}`);
  });
  tabMenu.appendChild(newItem);
}

tabBtn.addEventListener('click', () => {
  tabMenu.classList.toggle('hidden');
  renderTabMenu();
});
tabBtn.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    tabBtn.click();
  }
});

document.addEventListener('click', (e) => {
  if (!tabMenu.classList.contains('hidden') && !tabBtn.contains(e.target) && !tabMenu.contains(e.target)) {
    tabMenu.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;

  if (e.key === 'Tab') {
    e.preventDefault();
    currentTab = (currentTab + 1) % tabs.length;
    tabMenu.classList.add('hidden');
    renderTab();
    saveState();
    showToast(`Switched to ${tabs[currentTab].name}`);
  } else if (e.key.toLowerCase() === 't') {
    e.preventDefault();
    tabs.push({ name: `Tab ${tabs.length + 1}`, lines: [''] });
    currentTab = tabs.length - 1;
    tabMenu.classList.add('hidden');
    renderTab();
    saveState();
    showToast(`Created ${tabs[currentTab].name}`);
  } else if (e.key === '=') {
    e.preventDefault();
    settingsBtn.click();
  }
});

settingsBtn.addEventListener('click', () => {
  const showing = !settingsView.classList.toggle('hidden');
  container.classList.toggle('hidden', showing);
  if (!showing) updateDivider();
});
settingsBtn.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    settingsBtn.click();
  }
});

themeSelect.addEventListener('change', (e) => {
  applyTheme(e.target.value);
  saveState();
});

gradientSelect.addEventListener('change', (e) => {
  updateGradient(e.target.value);
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

angleModeSelect.addEventListener('change', () => {
  recalc();
  saveState();
});

renderTab();

function handleWindowResize() {
  const sizeValue = `${window.innerWidth},${window.innerHeight}`;
  const values = Array.from(sizeSelect.options)
    .map(o => o.value)
    .filter(v => v.includes(','));
  if (values.includes(sizeValue)) {
    sizeSelect.value = sizeValue;
  } else {
    sizeSelect.value = 'custom';
  }
  updateDivider();
}

window.addEventListener('resize', handleWindowResize);

module.exports = {
  deg2rad,
  rad2deg,
  getCaret,
  setCaret,
  saveState,
  loadState,
  applyTheme,
  compute,
  vars
};
