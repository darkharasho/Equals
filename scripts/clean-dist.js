const { execSync } = require('child_process');
const rimraf = require('rimraf');
const path = require('path');

if (process.platform === 'win32') {
  try {
    execSync('taskkill /IM Equals.exe /F', { stdio: 'ignore' });
  } catch (e) {
    // ignore if the process is not running
  }
}

rimraf.sync(path.join(__dirname, '..', 'dist'));
