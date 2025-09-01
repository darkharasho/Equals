/** @jest-environment node */

jest.mock('../app/auto-updater', () => ({
  initAutoUpdate: jest.fn()
}));

const createWindowMock = jest.fn();

jest.mock('electron', () => {
  const BrowserWindow = function() {
    return { loadFile: jest.fn() };
  };
  return {
    app: {
      whenReady: () => Promise.resolve(),
      on: jest.fn(),
      isPackaged: true,
      getVersion: jest.fn()
    },
    BrowserWindow,
    ipcMain: { on: jest.fn(), handle: jest.fn() },
    nativeTheme: {}
  };
});

test('main initializes auto updater when packaged', async () => {
  require('../main.js');
  const { initAutoUpdate } = require('../app/auto-updater');
  // Wait for whenReady promise to resolve
  await Promise.resolve();
  expect(initAutoUpdate).toHaveBeenCalled();
});
