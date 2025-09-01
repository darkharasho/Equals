/** @jest-environment jsdom */

jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn(),
    invoke: jest.fn().mockResolvedValue('1.0.0')
  }
}));

let renderer;
let ipcRenderer;
const math = require('mathjs');

function setupDOM() {
  document.body.innerHTML = `
    <div id="container"></div>
    <div id="tab-btn"></div>
    <div id="settings-btn"></div>
    <div id="tab-menu"></div>
    <div id="min-btn"></div>
    <div id="max-btn"></div>
    <div id="close-btn"></div>
    <div id="settings"></div>
    <select id="theme-select">
      <option value="dark"></option>
      <option value="light"></option>
    </select>
    <select id="gradient-select">
      <option value="#a,#b"></option>
      <option value="#000000,#ffffff"></option>
    </select>
    <select id="size-select">
      <option value="300,300"></option>
    </select>
    <input id="font-size" />
    <select id="angle-mode">
      <option value="deg"></option>
      <option value="rad"></option>
    </select>
    <div id="version"></div>
    <div id="toast"></div>
  `;
}

beforeEach(() => {
  jest.resetModules();
  setupDOM();
  localStorage.clear();
  HTMLElement.prototype.scrollIntoView = jest.fn();
  let active = null;
  Object.defineProperty(document, 'activeElement', {
    get() {
      return active;
    },
    set(v) {
      active = v;
    },
    configurable: true
  });
  HTMLElement.prototype.focus = function() { document.activeElement = this; };
  renderer = require('../renderer.js');
  ipcRenderer = require('electron').ipcRenderer;
  ipcRenderer.send.mockClear();
});

test('deg2rad and rad2deg convert angles correctly', () => {
  expect(renderer.deg2rad(180)).toBeCloseTo(Math.PI);
  expect(renderer.rad2deg(Math.PI)).toBeCloseTo(180);
});

test('setCaret and getCaret handle positions', () => {
  const div = document.createElement('div');
  div.contentEditable = true;
  div.textContent = 'hello';
  document.body.appendChild(div);
  renderer.setCaret(div, 3);
  expect(renderer.getCaret(div)).toBe(3);
});

test('saveState stores settings in localStorage', () => {
  document.getElementById('theme-select').value = 'light';
  document.getElementById('gradient-select').value = '#a,#b';
  document.getElementById('size-select').value = '300,300';
  document.getElementById('font-size').value = '20';
  document.getElementById('angle-mode').value = 'rad';

  renderer.saveState();
  const saved = JSON.parse(localStorage.getItem('equalsState'));
  expect(saved.settings).toMatchObject({
    theme: 'light',
    gradient: '#a,#b',
    size: '300,300',
    fontSize: '20',
    angleMode: 'rad'
  });
});

test('loadState restores settings from localStorage', () => {
  localStorage.setItem('equalsState', JSON.stringify({
    tabs: [{ name: 'Tab 1', lines: [''] }],
    currentTab: 0,
    settings: {
      theme: 'light',
      gradient: '#a,#b',
      size: '300,300',
      fontSize: '18',
      angleMode: 'rad'
    }
  }));
  renderer.loadState();
  expect(document.getElementById('theme-select').value).toBe('light');
  expect(document.getElementById('gradient-select').value).toBe('#a,#b');
  expect(document.getElementById('size-select').value).toBe('300,300');
  expect(document.getElementById('font-size').value).toBe('18');
  expect(document.getElementById('angle-mode').value).toBe('rad');
});

test('changing gradient updates select background', () => {
  const select = document.getElementById('gradient-select');
  select.value = '#000000,#ffffff';
  select.dispatchEvent(new Event('change'));
  expect(select.style.backgroundImage).toContain('#000000');
  expect(select.style.backgroundImage).toContain('#ffffff');
  expect(select.style.backgroundColor).toBe('var(--settings-bg)');
});

test('applyTheme updates body classes and notifies main process', () => {
  renderer.applyTheme('light');
  expect(document.body.classList.contains('light')).toBe(true);
  expect(ipcRenderer.send).toHaveBeenCalledWith('theme', 'light');
});

test('compute evaluates basic arithmetic operations', () => {
  const add = renderer.compute('1+2', [], []);
  const sub = renderer.compute('5-3', [], []);
  const mul = renderer.compute('4*2', [], []);
  const div = renderer.compute('8/4', [], []);
  expect(add.value).toBe(3);
  expect(sub.value).toBe(2);
  expect(mul.value).toBe(8);
  expect(div.value).toBe(2);
});

test('compute evaluates complex arithmetic expressions', () => {
  const complex = renderer.compute('2*(3+4)-5/(1+1)', [], []);
  const trig = renderer.compute('sin(90)+cos(0)', [], []);
  expect(complex.value).toBeCloseTo(11.5);
  expect(trig.value).toBeCloseTo(2);
});

test('compute handles line and variable ranges with aggregate helpers', () => {
  const lineResults = [1, 2, 3, 4, 5];
  const avg = renderer.compute('avg(1..5)', lineResults, []);
  expect(avg.value).toBe(3);
  const mean = renderer.compute('mean(1..5)', lineResults, []);
  expect(mean.value).toBe(3);
  renderer.vars.a = { value: 1 };
  renderer.vars.b = { value: 2 };
  renderer.vars.c = { value: 3 };
  renderer.vars.d = { value: 4 };
  const sum = renderer.compute('sum($a:$d)', [], []);
  expect(sum.value).toBe(10);
  const median = renderer.compute('median(1..5)', lineResults, []);
  expect(median.value).toBe(3);
  const std = renderer.compute('std(1..5)', lineResults, []);
  expect(std.value).toBeCloseTo(math.std(lineResults));
});

test('variable assignments persist across computations', () => {
  const assign = renderer.compute('$a = 1', [], []);
  expect(assign.value).toBe(1);
  renderer.vars[assign.assign] = { value: assign.value };
  const res = renderer.compute('$a + 2', [], []);
  expect(res.value).toBe(3);
});

test('pasting multiple lines splits into separate lines', () => {
  const container = document.getElementById('container');
  const expr = container.querySelector('.expr[data-index="0"]');
  expr.textContent = '$a = 1\n$a + 2';
  expr.dispatchEvent(new Event('input', { bubbles: true }));
  const lines = container.querySelectorAll('.line');
  expect(lines.length).toBe(2);
  const second = container.querySelector('.res[data-index="1"]');
  expect(second.textContent).toBe('3');
});

test('enter on empty line inserts a new line below', () => {
  const container = document.getElementById('container');
  const expr = container.querySelector('.expr[data-index="0"]');
  renderer.setCaret(expr, 0);
  expr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(document.activeElement.dataset.index).toBe('1');
  document.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  );
  expect(document.activeElement.dataset.index).toBe('2');
});

test('line deletion does not create an extra blank line', () => {
  const container = document.getElementById('container');
  const expr = container.querySelector('.expr[data-index="0"]');
  expr.textContent = '\n';
  expr.dispatchEvent(new Event('input', { bubbles: true }));
  const lines = container.querySelectorAll('.line');
  expect(lines.length).toBe(1);
});
