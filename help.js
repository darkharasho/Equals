const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

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
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  for (const line of lines) {
    if (line.startsWith('### ')) html += `<h3>${line.slice(4)}</h3>`;
    else if (line.startsWith('## ')) html += `<h2>${line.slice(3)}</h2>`;
    else if (line.startsWith('# ')) html += `<h1>${line.slice(2)}</h1>`;
    else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${line.slice(2)}</li>`;
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<br />';
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${line}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');
}

function showIndex() {
  const docsDir = path.join(__dirname, 'docs');
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();
  const list = files.map(f => `<li><a href="#" data-file="${f}">${f.replace('.md','')}</a></li>`).join('');
  container.innerHTML = `<ul>${list}</ul>`;
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
