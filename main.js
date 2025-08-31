const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 250,
    height: 250,
    minWidth: 250,
    minHeight: 250,
    resizable: false,
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    backgroundMaterial: 'mica',
    backgroundColor: '#00000000',
    roundedCorners: true,
    icon: path.join(__dirname, 'app/icons/equals.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

ipcMain.on('window:minimize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win.minimize();
});

ipcMain.on('theme', (e, theme) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (theme === 'acrylic') win.setBackgroundMaterial('acrylic');
  else win.setBackgroundMaterial('mica');
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

ipcMain.on('window:resize', (e, size) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win.setResizable(true);
  win.setSize(size.width, size.height);
  win.setMinimumSize(size.width, size.height);
  win.setResizable(false);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
