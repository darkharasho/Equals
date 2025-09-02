const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkg = require('../../package.json');
const version = pkg.version.replace(/\./g, '_');
const distDir = path.join(__dirname, '..', '..', 'dist');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// clean dist
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir);
// build installer
run('npx electron-builder --win', {
  env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
});

// rename installer
const installer = path.join(distDir, 'Equals Setup.exe');
if (fs.existsSync(installer)) {
  fs.renameSync(installer, path.join(distDir, `Equals-${version}-setup.exe`));
}
