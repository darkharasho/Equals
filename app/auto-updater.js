const { autoUpdater } = require('electron-updater');

function initAutoUpdate() {
  // check GitHub for updates and download the latest installer
  return autoUpdater.checkForUpdatesAndNotify().catch(() => {
    // ignore errors to avoid crashing the app if update check fails
  });
}

module.exports = { initAutoUpdate };
