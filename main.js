const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const { initAutoUpdate } = require('./app/auto-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 250,
    height: 250,
    minWidth: 250,
    minHeight: 250,
    resizable: true,
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    backgroundMaterial: 'mica',
    backgroundColor: '#00000000',
    roundedCorners: true,
    icon: path.join(__dirname, 'app/icons/equals_v2.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

let helpWin = null;

function createHelpWindow() {
  if (helpWin) {
    helpWin.focus();
    return;
  }
  helpWin = new BrowserWindow({
    width: 400,
    height: 400,
    minWidth: 300,
    minHeight: 300,
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    backgroundMaterial: 'mica',
    backgroundColor: '#00000000',
    roundedCorners: true,
    resizable: true,
    icon: path.join(__dirname, 'app/icons/equals_v2.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  helpWin.loadFile('help.html');
  helpWin.on('closed', () => {
    helpWin = null;
  });
}

ipcMain.on('window:minimize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win.minimize();
});

ipcMain.on('theme', (e, theme) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (theme === 'acrylic') {
    win.setBackgroundMaterial('acrylic');
    nativeTheme.themeSource = 'dark';
  } else {
    win.setBackgroundMaterial('mica');
    nativeTheme.themeSource = theme === 'light' ? 'light' : 'dark';
  }
});

ipcMain.on('window:maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on('window:close', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win.close();
});

ipcMain.on('help:open', () => {
  createHelpWindow();
});

ipcMain.on('window:resize', (e, size) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const w = Number(size?.width);
  const h = Number(size?.height);
  if (Number.isFinite(w) && Number.isFinite(h)) {
    win.setResizable(true);
    win.setSize(w, h);
  }
});

ipcMain.handle('app:version', () => app.getVersion());

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    initAutoUpdate();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
