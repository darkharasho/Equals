/** @jest-environment node */

const mockShowMessageBox = jest.fn().mockResolvedValue({ response: 0 });

jest.mock('electron', () => ({
  dialog: { showMessageBox: mockShowMessageBox },
}), { virtual: true });

jest.mock('electron-updater', () => ({
  autoUpdater: {},
}), { virtual: true });

test('initAutoUpdate checks for updates and prompts to install', async () => {
  const { initAutoUpdate, mockUpdateAvailable } = require('../app/auto-updater');
  const updater = mockUpdateAvailable();
  await initAutoUpdate();

  expect(updater.setFeedURL).toHaveBeenCalledWith({
    url: 'https://github.com/darkharasho/Equals/releases/latest'
  });
  expect(updater.checkForUpdatesAndNotify).toHaveBeenCalled();

  const handler = updater.on.mock.calls.find(([e]) => e === 'update-downloaded')[1];
  await handler();
  expect(mockShowMessageBox).toHaveBeenCalled();
  expect(updater.quitAndInstall).toHaveBeenCalled();
});

