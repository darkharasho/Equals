const { autoUpdater } = require('electron-updater');

function initAutoUpdate() {
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
  autoUpdater.checkForUpdatesAndNotify = jest
    .fn()
    .mockResolvedValue({ updateInfo: { version: '0.0.0-mock' } });
  return autoUpdater;
}

module.exports = { initAutoUpdate, mockUpdateAvailable };
