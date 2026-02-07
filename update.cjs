const processes = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { common } = require('./update-common.cjs');

// if (process.versions.node.split('.')[0] != '16') {
// 	console.error('Please use Node v16 for updating penguinmod versions!');
// 	process.exit(0);
// }

const pmDir = path.resolve(__dirname, 'penguinmod');
try {
  fs.accessSync(pmDir);
  fs.rmSync(pmDir, {
    recursive: true,
    force: true,
  });
} catch {
} finally {
  fs.mkdirSync(pmDir);
}

const srcDir = path.resolve(__dirname, 'src');
try {
  fs.accessSync(srcDir);
  fs.rmSync(srcDir, {
    recursive: true,
    force: true,
  });
} catch {
} finally {
  fs.mkdirSync(srcDir);
}

processes
  .spawn(
    'git clone https://github.com/PenguinMod-Desktop/PenguinMod-Desktop-Gui.git ./penguinmod',
    {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    },
  )
  .once('close', common);
