/** @jest-environment node */

jest.mock('electron-updater', () => ({
  autoUpdater: {}
}), { virtual: true });

test('initAutoUpdate checks for updates', async () => {
  const { initAutoUpdate, mockUpdateAvailable } = require('../app/auto-updater');
  const updater = mockUpdateAvailable();
  await initAutoUpdate();
  expect(updater.checkForUpdatesAndNotify).toHaveBeenCalled();
});
