/** @jest-environment node */

const mockSend = jest.fn();
const mockWindow = { webContents: { send: mockSend } };
const mockGetAllWindows = jest.fn(() => [mockWindow]);
const mockIpcOn = jest.fn();

jest.mock('electron', () => ({
  BrowserWindow: { getAllWindows: mockGetAllWindows },
  ipcMain: { on: mockIpcOn },
}), { virtual: true });

jest.mock('electron-updater', () => ({
  autoUpdater: {},
}), { virtual: true });

test('initAutoUpdate checks for updates and prompts to install', async () => {
  const { initAutoUpdate, mockUpdateAvailable } = require('../app/auto-updater');
  const updater = mockUpdateAvailable();
  await initAutoUpdate();

  expect(updater.forceDevUpdateConfig).toBeUndefined();
  expect(updater.setFeedURL).toHaveBeenCalledWith({
    provider: 'github',
    owner: 'darkharasho',
    repo: 'Equals'
  });
  expect(updater.checkForUpdatesAndNotify).toHaveBeenCalled();

  const handler = updater.on.mock.calls.find(([e]) => e === 'update-downloaded')[1];
  handler();
  expect(mockGetAllWindows).toHaveBeenCalled();
  expect(mockSend).toHaveBeenCalledWith('update-downloaded');

  const installHandler = mockIpcOn.mock.calls.find(([e]) => e === 'update:install')[1];
  installHandler();
  expect(updater.quitAndInstall).toHaveBeenCalled();
});
