/** @jest-environment node */

jest.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdatesAndNotify: jest.fn().mockResolvedValue()
  }
}));

test('initAutoUpdate checks for updates', async () => {
  const { initAutoUpdate } = require('../app/auto-updater');
  const { autoUpdater } = require('electron-updater');
  await initAutoUpdate();
  expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
});
