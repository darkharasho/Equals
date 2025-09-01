const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const container = document.getElementById('container');
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

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

function mdToHtml(md) {
  return marked.parse(md);
}

function showIndex() {
  const docsDir = path.join(__dirname, 'docs');
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();
  const list = files.map(f => `<li><a href="#" data-file="${f}">${f.replace('.md','')}</a></li>`).join('');
  container.innerHTML = `<nav id="toc"><h2>Help Topics</h2><ul class="toc-list">${list}</ul></nav>`;
  container.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const file = a.getAttribute('data-file');
      showDoc(file);
    });
  });
}

function showDoc(file) {
  const filePath = path.join(__dirname, 'docs', file);
  const text = fs.readFileSync(filePath, 'utf8');
  container.innerHTML = `<button id="back-btn">Back</button><div id="help-content">${mdToHtml(text)}</div>`;
  document.getElementById('back-btn').addEventListener('click', showIndex);
  container.querySelectorAll('#help-content a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href.endsWith('.md')) {
      a.addEventListener('click', e => {
        e.preventDefault();
        showDoc(href);
      });
    }
  });
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
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('equalsState') || '{}');
    if (saved.settings) {
      applyTheme(saved.settings.theme || 'dark');
      updateGradient(saved.settings.gradient || '#bb87f8,#7aa2f7');
      document.body.style.fontSize = (saved.settings.fontSize || 16) + 'px';
    } else {
      applyTheme('dark');
      updateGradient('#bb87f8,#7aa2f7');
    }
  } catch {
    applyTheme('dark');
    updateGradient('#bb87f8,#7aa2f7');
  }
}

loadSettings();
showIndex();
