const assert = require('node:assert/strict');
const {
  computeFittedColumnWidth,
  DEFAULT_VISIBLE_COLUMNS,
  MIN_FITTED_COLUMN_WIDTH,
} = require('../shared-layout');

assert.equal(DEFAULT_VISIBLE_COLUMNS, 4);
assert.equal(computeFittedColumnWidth(1400), 350);
assert.equal(computeFittedColumnWidth(1411), 352);
assert.equal(computeFittedColumnWidth(960), 240);
assert.equal(computeFittedColumnWidth(320), MIN_FITTED_COLUMN_WIDTH);
assert.equal(computeFittedColumnWidth(1500, 5), 300);
assert.equal(computeFittedColumnWidth(0), MIN_FITTED_COLUMN_WIDTH);
assert.equal(computeFittedColumnWidth(Number.NaN), MIN_FITTED_COLUMN_WIDTH);

console.log('layout-width tests passed');
