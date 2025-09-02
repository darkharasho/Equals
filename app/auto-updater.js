const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow } = require('electron');

let logWin;

function ensureLogWindow() {
  if (logWin) return logWin;
  logWin = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Update Log',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  logWin.on('closed', () => {
    logWin = null;
  });
  logWin.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        "<html><body><pre id='log'></pre><script>" +
          "const {ipcRenderer}=require('electron');" +
          "ipcRenderer.on('log',(e,msg)=>{const pre=document.getElementById('log');pre.textContent+=msg+'\\n';});" +
          '</script></body></html>'
      )
  );
  return logWin;
}

function log(message) {
  const win = ensureLogWindow();
  win.webContents.send('log', message);
}

function initAutoUpdate() {
  log('Starting update check');

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'darkharasho',
    repo: 'Equals'
  });

  autoUpdater.on('checking-for-update', () => {
    log('Checking for updates');
  });

  autoUpdater.on('update-available', () => {
    log('Update available, downloading');
  });

  autoUpdater.on('update-not-available', () => {
    log('No update available');
    setTimeout(() => {
      if (logWin) logWin.close();
    }, 3000);
  });

  autoUpdater.on('error', (error) => {
    log(`Error: ${error?.message || error}`);
    setTimeout(() => {
      if (logWin) logWin.close();
    }, 3000);
  });

  autoUpdater.on('download-progress', (p) => {
    log(`Download ${p.percent.toFixed(1)}%`);
  });

  // show a prompt once the update has been downloaded
  autoUpdater.on('update-downloaded', () => {
    log('Update downloaded');
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. Install now?',
        buttons: ['Install', 'Later']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
        if (logWin) logWin.close();
      });
  });

  // check GitHub for updates and download the latest installer
  return autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log(`Update check failed: ${err?.message || err}`);
    // ignore errors to avoid crashing the app if update check fails
  });
}

// Testing helper to simulate an update being available. It swaps the
// `checkForUpdatesAndNotify` method with a Jest mock that resolves to a
// dummy update result so tests can assert the updater was invoked without
// performing any network requests.
function mockUpdateAvailable() {
  autoUpdater.checkForUpdatesAndNotify = jest.fn().mockResolvedValue({
    updateInfo: { version: '0.0.0-mock' }
  });
  autoUpdater.on = jest.fn();
  autoUpdater.quitAndInstall = jest.fn();
  autoUpdater.setFeedURL = jest.fn();
  return autoUpdater;
}

module.exports = { initAutoUpdate, mockUpdateAvailable };
