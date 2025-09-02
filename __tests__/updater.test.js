/** @jest-environment node */

const mockShowMessageBox = jest.fn().mockResolvedValue({ response: 0 });
const logSendMock = jest.fn();

const MockBrowserWindow = jest.fn().mockImplementation(() => ({
  webContents: { send: logSendMock },
  loadURL: jest.fn(),
  on: jest.fn(),
  once: jest.fn((event, cb) => cb && cb()),
  show: jest.fn(),
  close: jest.fn(),
}));

jest.mock(
  'electron',
  () => ({
    dialog: { showMessageBox: mockShowMessageBox },
    BrowserWindow: MockBrowserWindow,
    app: { isPackaged: true },
  }),
  { virtual: true }
);

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
  expect(MockBrowserWindow).toHaveBeenCalled();

  const checkingHandler = updater.on.mock.calls.find(([e]) => e === 'checking-for-update')[1];
  checkingHandler();
  expect(logSendMock).toHaveBeenCalledWith('log', expect.stringContaining('Checking for updates'));

  const handler = updater.on.mock.calls.find(([e]) => e === 'update-downloaded')[1];
  await handler();
  expect(mockShowMessageBox).toHaveBeenCalled();
  expect(updater.quitAndInstall).toHaveBeenCalled();
});

test('initAutoUpdate is a no-op when not packaged', async () => {
  jest.resetModules();
  const autoUpdaterMock = {
    checkForUpdatesAndNotify: jest.fn(),
    on: jest.fn(),
    setFeedURL: jest.fn(),
  };

  const mockWin = jest.fn();

  jest.doMock(
    'electron',
    () => ({
      dialog: { showMessageBox: jest.fn() },
      BrowserWindow: mockWin,
      app: { isPackaged: false },
    }),
    { virtual: true }
  );

  jest.doMock(
    'electron-updater',
    () => ({ autoUpdater: autoUpdaterMock }),
    { virtual: true }
  );

  const { initAutoUpdate } = require('../app/auto-updater');
  await initAutoUpdate();
  expect(autoUpdaterMock.checkForUpdatesAndNotify).not.toHaveBeenCalled();
  expect(mockWin).not.toHaveBeenCalled();
});

