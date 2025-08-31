const math = require('mathjs');
const { ipcRenderer } = require('electron');

let tabs = [{ lines: [''] }];
let currentTab = 0;

const container = document.getElementById('container');
const tabBtn = document.getElementById('tab-btn');
const tabMenu = document.getElementById('tab-menu');
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

minBtn.addEventListener('click', () => ipcRenderer.send('window:minimize'));
maxBtn.addEventListener('click', () => ipcRenderer.send('window:maximize'));
closeBtn.addEventListener('click', () => ipcRenderer.send('window:close'));

function highlight(text) {
  return text
    .replace(/(\d+(?:\.\d+)?%)/g, '<span class="percent">$1</span>')
    .replace(/([$€£]\s*\d+(?:\.\d+)?)/g, '<span class="currency">$1</span>')
    .replace(/(\d+(?:\.\d+)?)/g, '<span class="number">$1</span>');
}

function compute(text) {
  if (!text.trim()) return '';
  let expr = text.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
                 .replace(/[$€£]/g, '');
  try {
    const res = math.evaluate(expr);
    return typeof res === 'number' ? res.toString() : '';
  } catch (e) {
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
    res.textContent = compute(text);

    line.appendChild(expr);
    line.appendChild(res);
    container.appendChild(line);
  });
}

function onInput(e) {
  const index = Number(e.target.dataset.index);
  const text = e.target.innerText;
  tabs[currentTab].lines[index] = text;
  e.target.innerHTML = highlight(text);
  placeCaretAtEnd(e.target);
  e.target.parentNode.querySelector('.res').textContent = compute(text);
}

function onKey(e) {
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
    item.textContent = `Tab ${idx + 1}`;
    item.addEventListener('click', () => {
      currentTab = idx;
      tabMenu.classList.add('hidden');
      renderTab();
    });
    tabMenu.appendChild(item);
  });
  const newItem = document.createElement('div');
  newItem.textContent = 'New Tab';
  newItem.addEventListener('click', () => {
    tabs.push({ lines: [''] });
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

renderTab();
