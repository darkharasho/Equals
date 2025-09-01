const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function initAutoUpdate() {
  // show a prompt once the update has been downloaded
  autoUpdater.on('update-downloaded', () => {
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
      });
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
  return autoUpdater;
}

module.exports = { initAutoUpdate, mockUpdateAvailable };
