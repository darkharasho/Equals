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

  expect(updater.forceDevUpdateConfig).toBe(true);
  expect(updater.setFeedURL).toHaveBeenCalledWith({
    provider: 'github',
    owner: 'darkharasho',
    repo: 'Equals'
  });
  expect(updater.checkForUpdatesAndNotify).toHaveBeenCalled();

  const calls = updater.on.mock.calls;

  const downloadHandler = calls.find(([e]) => e === 'update-downloaded')[1];
  await downloadHandler();
  expect(mockShowMessageBox).toHaveBeenCalled();
  expect(updater.quitAndInstall).toHaveBeenCalled();

  const errorHandler = calls.find(([e]) => e === 'error')[1];
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const err = new Error('boom');
  errorHandler(err);
  expect(mockConsoleError).toHaveBeenCalledWith('Auto update error:', err);
  mockConsoleError.mockRestore();
});

