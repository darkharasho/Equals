/** @jest-environment jsdom */

jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn(),
    invoke: jest.fn().mockResolvedValue('1.0.0')
  }
}));

jest.mock('../app/exchangeRates.js', () => ({
  getRate: jest.fn().mockResolvedValue(0.9),
  clearCache: jest.fn()
}));

let renderer;
let ipcRenderer;

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
    </select>
    <select id="size-select">
      <option value="300,300"></option>
    </select>
    <input id="font-size" />
    <select id="angle-mode">
      <option value="deg"></option>
      <option value="rad"></option>
    </select>
    <button id="refresh-rates"></button>
    <div id="version"></div>
    <div id="toast"></div>
  `;
}

beforeEach(() => {
  jest.resetModules();
  setupDOM();
  localStorage.clear();
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

test('applyTheme updates body classes and notifies main process', () => {
  renderer.applyTheme('light');
  expect(document.body.classList.contains('light')).toBe(true);
  expect(ipcRenderer.send).toHaveBeenCalledWith('theme', 'light');
});

test('compute evaluates basic arithmetic operations', async () => {
  const add = await renderer.compute('1+2', [], []);
  const sub = await renderer.compute('5-3', [], []);
  const mul = await renderer.compute('4*2', [], []);
  const div = await renderer.compute('8/4', [], []);
  expect(add.value).toBe(3);
  expect(sub.value).toBe(2);
  expect(mul.value).toBe(8);
  expect(div.value).toBe(2);
});

test('compute evaluates complex arithmetic expressions', async () => {
  const complex = await renderer.compute('2*(3+4)-5/(1+1)', [], []);
  const trig = await renderer.compute('sin(90)+cos(0)', [], []);
  expect(complex.value).toBeCloseTo(11.5);
  expect(trig.value).toBeCloseTo(2);
});

test('compute converts currencies using exchange rates', async () => {
  const result = await renderer.compute('10 USD to EUR', [], []);
  const rates = require('../app/exchangeRates.js');
  expect(rates.getRate).toHaveBeenCalledWith('USD', 'EUR');
  expect(result.value).toBeCloseTo(9);
});

test('compute converts currencies using trailing symbol', async () => {
  const result = await renderer.compute('10¥ to USD', [], []);
  const rates = require('../app/exchangeRates.js');
  expect(rates.getRate).toHaveBeenCalledWith('JPY', 'USD');
  expect(result.value).toBeCloseTo(9);
});

test('compute converts currencies using currency names', async () => {
  const result = await renderer.compute('10 Yen to USD', [], []);
  const rates = require('../app/exchangeRates.js');
  expect(rates.getRate).toHaveBeenCalledWith('JPY', 'USD');
  expect(result.value).toBeCloseTo(9);
});

test('compute converts currencies using leading symbol', async () => {
  const result = await renderer.compute('¥10 to USD', [], []);
  const rates = require('../app/exchangeRates.js');
  expect(rates.getRate).toHaveBeenCalledWith('JPY', 'USD');
  expect(result.value).toBeCloseTo(9);
});

test('compute converts currencies using symbols for both currencies', async () => {
  const result = await renderer.compute('¥10 to $', [], []);
  const rates = require('../app/exchangeRates.js');
  expect(rates.getRate).toHaveBeenCalledWith('JPY', 'USD');
  expect(result.value).toBeCloseTo(9);
});

test('refresh button clears cached rates', async () => {
  const rates = require('../app/exchangeRates.js');
  const btn = document.getElementById('refresh-rates');
  btn.click();
  await Promise.resolve();
  expect(rates.clearCache).toHaveBeenCalled();
});
