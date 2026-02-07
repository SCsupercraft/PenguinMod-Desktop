const path = require('node:path');
const fs = require('node:fs');
const { updateWhatsNewPage } = require('./update-common.cjs');

const appDir = path.resolve(__dirname, 'app');
const srcDir = path.resolve(__dirname, 'src');

if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir);
fs.copyFileSync(
  path.join(appDir, 'whats-new.html'),
  path.join(srcDir, 'whats-new.html'),
);
fs.copyFileSync(
  path.join(appDir, 'whats-new.js'),
  path.join(srcDir, 'whats-new.js'),
);

updateWhatsNewPage();
