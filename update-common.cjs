const processes = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const appDir = path.resolve(__dirname, 'app');
const pmDir = path.resolve(__dirname, 'penguinmod');
const srcDir = path.resolve(__dirname, 'src');

function extractLatestSummary(lines, versionIndex) {
  const summaryLines = [];
  for (let i = versionIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) break;

    summaryLines.push(formatChangeLine(line.trim()));
  }

  return summaryLines.join('\n').trim().replaceAll('\n', '      <br>');
}

/**
 * @typedef {object} ParsedChangeLine
 * @property {number} level
 * @property {string} text
 */

/**
 * @typedef {object} Change
 * @property {string} text
 * @property {Change[]} children
 */

/**
 * @typedef {Change[]} ChangeList
 */

/**
 * @param {string} raw
 * @returns {ParsedChangeLine}
 */
function parseIndentedLine(raw) {
  const match = raw.match(/^(\s*)- (.*)$/);
  if (!match) return null;

  const spaces = match[1].length;
  const level = Math.floor(spaces / 2); // 2 spaces = 1 level
  const text = match[2];

  return { level, text };
}

/**
 * @param {string[]} lines
 * @returns {ChangeList}
 */
function buildNestedList(lines) {
  const root = [];
  const stack = [{ level: -1, children: root }];

  for (const raw of lines) {
    const parsed = parseIndentedLine(raw);
    if (!parsed) continue;

    const { level, text } = parsed;

    while (stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const node = { text, children: [] };
    stack[stack.length - 1].children.push(node);

    stack.push({ level, children: node.children });
  }

  return root;
}

/**
 * @param {ChangeList} nodes
 * @returns {string}
 */
function renderList(nodes) {
  let html = '<ul>';

  for (const node of nodes) {
    html += '<li>';
    html += formatChangeLine(node.text);

    if (node.children.length > 0) {
      html += renderList(node.children);
    }

    html += '</li>';
  }

  html += '</ul>';
  return html;
}

/**
 * @param {string} line
 */
function formatChangeLine(line) {
  if (!line) return '';

  return line
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/**
 * @param {string} changeText
 * @param {string[]} change
 */
function formatChange(changeText, change) {
  const tree = buildNestedList(change);
  const html = renderList(tree);

  return `<h2>${changeText}</h2>\n      ${html}`;
}

function extractLatestChanges(lines, versionIndex) {
  const changes = [];
  let changeText = '',
    change = [];
  for (let i = versionIndex + 1; i < lines.length; i++) {
    /**
     * @type {string}
     */
    const line = lines[i];

    if (line.startsWith('## ')) {
      break;
    }

    if (line.startsWith('### ')) {
      if (change.length != 0) {
        changes.push(formatChange(changeText, change));
        change = [];
      }
      changeText = line.replace('### ', '').trim();
    } else {
      if (changeText.length == 0) continue;

      const trim = line.trimEnd().replaceAll('\r', '');
      if (trim.length != 0) {
        change.push(trim);
      }
    }
  }

  if (change.length != 0) {
    changes.push(formatChange(changeText, change));
  }

  return changes.join('\n      ').trim();
}

function updateWhatsNewPage() {
  console.log('Inserting changelog into `src/whats-new.html`');
  const htmlPath = path.join(srcDir, 'whats-new.html');
  const changelogPath = path.resolve(__dirname, 'CHANGELOG.md');

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const changelog = fs.readFileSync(changelogPath, 'utf-8');

  const lines = changelog.split('\n');

  const versionIndex = lines.findIndex((line) => line.startsWith('## v'));
  if (versionIndex === -1)
    throw new Error('Failed to find version in changelog!');
  const version = lines[versionIndex].replace('## v', '').trim();

  console.log(`Adding changelog from version ${version}`);

  const summary = extractLatestSummary(lines, versionIndex);
  const changes = extractLatestChanges(lines, versionIndex);

  fs.writeFileSync(
    htmlPath,
    html
      .replace('<!--Version-->', version)
      .replace('<!--Summary-->', summary)
      .replace('<!--Content-->', changes),
    'utf-8',
  );

  console.log('Updated `src/whats-new.html`');
}

function common(code) {
  if (code != 0) throw new Error('An unexpected error occurred!');

  fs.rmSync(path.resolve(pmDir, 'package-lock.json'));
  processes
    .spawn('npm i --force', {
      cwd: pmDir,
      stdio: 'inherit',
      shell: true,
    })
    .once('close', (code) => {
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
          fs.cpSync(appDir, srcDir, {
            recursive: true,
            force: true,
          });
          fs.rmSync(pmDir, { recursive: true, force: true });

          updateWhatsNewPage();
        });
    });
}

module.exports = {
  updateWhatsNewPage,
  common,
};
