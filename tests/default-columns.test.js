const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Read renderer.js and verify DEFAULT_COLUMNS
const rendererContent = fs.readFileSync(path.join(__dirname, '../renderer.js'), 'utf-8');

// Match DEFAULT_COLUMNS array
const match = rendererContent.match(/const DEFAULT_COLUMNS = (\[[\s\S]*?\]);/);
assert.ok(match, 'DEFAULT_COLUMNS should be defined in renderer.js');

// Parse DEFAULT_COLUMNS safely
const defaultCols = eval(match[1]);
assert.equal(defaultCols.length, 4, 'Should have exactly 4 default columns');

assert.equal(defaultCols[0].title, '主页');
assert.equal(defaultCols[0].url, 'https://x.com/home');

assert.equal(defaultCols[1].title, 'AI');
assert.equal(defaultCols[1].url, 'https://x.com/i/lists/2062302318897611056');

assert.equal(defaultCols[2].title, '美股');
assert.equal(defaultCols[2].url, 'https://x.com/i/lists/2059566674173743297');

assert.equal(defaultCols[3].title, '收藏');
assert.equal(defaultCols[3].url, 'https://x.com/i/bookmarks');

console.log('default-columns tests passed');
