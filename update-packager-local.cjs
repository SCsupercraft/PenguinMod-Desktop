const path = require('node:path');
const fs = require('node:fs');
const { commonPackager, clean } = require('./update-common.cjs');

// if (process.versions.node.split('.')[0] != '16') {
// 	console.error('Please use Node v16 for updating penguinmod versions!');
// 	process.exit(0);
// }

const packagerDir = path.resolve(__dirname, 'packager');
clean(packagerDir);

const srcDir = path.resolve(__dirname, 'src');
try {
  fs.mkdirSync(srcDir);
} catch {}

const packagerSrc = path.resolve(__dirname, '../PenguinMod-Desktop-Packager');
try {
  fs.accessSync(packagerSrc);
} catch {
  console.error(`No directory exists at ${packagerSrc}`);
  process.exit(0);
}

console.log(`Cloning from '${path.relative(__dirname, packagerSrc)}'`);

fs.cpSync(packagerSrc, packagerDir, {
  recursive: true,
  force: true,
});

commonPackager();
