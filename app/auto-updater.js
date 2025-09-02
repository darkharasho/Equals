const { autoUpdater } = require('electron-updater');
const { BrowserWindow, ipcMain } = require('electron');

function initAutoUpdate() {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'darkharasho',
    repo: 'Equals'
  });
  // notify renderer to show a toast once the update has been downloaded
  autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-downloaded');
    });
  });

  // listen for confirmation from the renderer to install the update
  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  // check GitHub for updates and download the latest installer
  return autoUpdater.checkForUpdatesAndNotify().catch(() => {
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
