const processes = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { commonPackager, clean } = require('./update-common.cjs');

// if (process.versions.node.split('.')[0] != '16') {
// 	console.error('Please use Node v16 for updating penguinmod versions!');
// 	process.exit(0);
// }

const packagerDir = path.resolve(__dirname, 'packager');
clean(packagerDir)

const srcDir = path.resolve(__dirname, 'src');
try {
  fs.mkdirSync(srcDir);
} catch {}

processes
  .spawn(
    'git clone https://github.com/PenguinMod-Desktop/PenguinMod-Desktop-Packager.git ./packager',
    {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    },
  )
  .once('close', (code) => {
    if (code != 0) {
      clean(packagerDir, false);
      throw new Error('An unexpected error occurred!');
    }
    commonPackager();
  });
