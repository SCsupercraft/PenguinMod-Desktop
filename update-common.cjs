const processes = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const appDir = path.resolve(__dirname, 'app');
const pmDir = path.resolve(__dirname, 'penguinmod');
const packagerDir = path.resolve(__dirname, 'packager');
const srcDir = path.resolve(__dirname, 'src');

function clean(dir, keep = true) {
  try {
    fs.accessSync(dir);
    fs.rmSync(dir, {
      recursive: true,
      force: true,
    });
  } catch {
  } finally {
    if (keep) fs.mkdirSync(dir);
  }
}

function common() {
  fs.rmSync(path.resolve(pmDir, 'package-lock.json'));

  processes
    .spawn('npm i --force', {
      cwd: pmDir,
      stdio: 'inherit',
      shell: true,
    })
    .once('close', (code) => {
      if (code != 0) {
        clean(pmDir, false); 
        throw new Error('An unexpected error occurred!');
      }

      process.env.NODE_ENV = 'production';

      processes
        .spawn('npm run build', {
          cwd: pmDir,
          stdio: 'inherit',
          shell: true,
        })
        .once('close', (code) => {
          if (code != 0) { 
            clean(pmDir, false)
            throw new Error('An unexpected error occurred!');
          }
          process.env.NODE_ENV = 'development';

          fs.cpSync(path.resolve(pmDir, 'build'), srcDir, {
            recursive: true,
            force: true,
          });
          fs.cpSync(appDir, srcDir, {
            recursive: true,
            force: true,
          });
          clean(pmDir, false)
        });
    });
}

function commonPackager() {
  fs.rmSync(path.resolve(packagerDir, 'package-lock.json'));

  processes
    .spawn('npm i --force', {
      cwd: packagerDir,
      stdio: 'inherit',
      shell: true,
    })
    .once('close', (code) => {
      if (code != 0) {
        clean(packagerDir, false); 
        throw new Error('An unexpected error occurred!');
      }

      process.env.NODE_ENV = 'production';

      processes
        .spawn('npm run build-standalone-prod', {
          cwd: packagerDir,
          stdio: 'inherit',
          shell: true,
        })
        .once('close', (code) => {
          if (code != 0) { 
            clean(packagerDir, false); 
            throw new Error('An unexpected error occurred!');
          }
          process.env.NODE_ENV = 'development';

          fs.cpSync(
            path.resolve(packagerDir, 'dist/standalone.html'),
            path.resolve(appDir, 'packager.html'), // Copy to app directory so rebuilding the main site doesn't delete the packager.
            {
              force: true,
            },
          );
          fs.cpSync(
            path.resolve(packagerDir, 'dist/standalone.html'),
            path.resolve(srcDir, 'packager.html'),
            {
              force: true,
            },
          );
          clean(packagerDir, false)
        });
    });
}

module.exports = {
  common,
  commonPackager,
  clean
};
