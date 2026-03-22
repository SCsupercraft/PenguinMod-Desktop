const path = require('node:path');
const fs = require('node:fs');
const { common, clean } = require('./update-common.cjs');

// if (process.versions.node.split('.')[0] != '16') {
// 	console.error('Please use Node v16 for updating penguinmod versions!');
// 	process.exit(0);
// }

const pmDir = path.resolve(__dirname, 'penguinmod');
clean(pmDir);

const srcDir = path.resolve(__dirname, 'src');
clean(srcDir);

const pmSrc = path.resolve(__dirname, '../PenguinMod-Desktop-Gui');
try {
  fs.accessSync(pmSrc);
} catch {
  console.error(`No directory exists at ${pmSrc}`);
  process.exit(0);
}

console.log(`Cloning from '${path.relative(__dirname, pmSrc)}'`);

fs.cpSync(pmSrc, pmDir, {
  recursive: true,
  force: true,
});

common();
