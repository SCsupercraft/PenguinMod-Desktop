const processes = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

if (process.versions.node.split('.')[0] != '16') {
	console.error('Please use Node v16 for updating penguinmod versions!');
	process.exit(0);
}

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

const git = processes.exec(
	'git clone https://github.com/PenguinMod/penguinmod.github.io.git ./penguinmod',
	{ cwd: __dirname }
);

git.stdout.pipe(process.stdout);
git.stderr.pipe(process.stderr);
git.once('exit', (code) => {
	if (code != 0) throw new Error('An unexpected error occurred!');

	fs.rmSync(path.resolve(pmDir, 'package-lock.json'));
	const npm = processes.exec('npm i --force', {
		cwd: pmDir,
	});

	npm.stdout.pipe(process.stdout);
	npm.stderr.pipe(process.stderr);
	npm.once('exit', (code) => {
		if (code != 0) throw new Error('An unexpected error occurred!');

		process.env.NODE_ENV = 'production';

		processes
			.spawn('npm run build', {
				cwd: pmDir,
				stdio: 'inherit',
				shell: true,
			})
			.once('close', (code) => {
				if (code != 0) throw new Error('An unexpected error occurred!');

				fs.cpSync(path.resolve(pmDir, 'build'), srcDir, {
					recursive: true,
					force: true,
				});
				fs.rmSync(pmDir, { recursive: true, force: true });
			});
	});
});
