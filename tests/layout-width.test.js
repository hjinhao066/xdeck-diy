const assert = require('node:assert/strict');
const {
  computeFittedColumnWidth,
  computeColumnZoom,
  DEFAULT_VISIBLE_COLUMNS,
  MIN_FITTED_COLUMN_WIDTH,
  ZOOM_BASE_COLUMN_WIDTH,
} = require('../shared-layout');

assert.equal(DEFAULT_VISIBLE_COLUMNS, 4);
assert.equal(computeFittedColumnWidth(1400), 350);
assert.equal(computeFittedColumnWidth(1411), 352);
assert.equal(computeFittedColumnWidth(960), 240);
assert.equal(computeFittedColumnWidth(320), MIN_FITTED_COLUMN_WIDTH);
assert.equal(computeFittedColumnWidth(1500, 5), 300);
assert.equal(computeFittedColumnWidth(0), MIN_FITTED_COLUMN_WIDTH);
assert.equal(computeFittedColumnWidth(Number.NaN), MIN_FITTED_COLUMN_WIDTH);

assert.equal(ZOOM_BASE_COLUMN_WIDTH, 380);
assert.equal(computeColumnZoom(380, 1), 1);           // base width → no zoom
assert.equal(computeColumnZoom(760, 1), 2);           // double width → double zoom
assert.equal(computeColumnZoom(570, 1), 1.5);         // 3-col vs 4-col ratio
assert.equal(computeColumnZoom(380, 1.2), 1.2);       // textScale (Ctrl+/-) multiplies on top
assert.equal(computeColumnZoom(570, 2), 3);
assert.equal(computeColumnZoom(50, 1), 0.25);         // clamped to Electron min
assert.equal(computeColumnZoom(38000, 1), 5);         // clamped to Electron max
assert.equal(computeColumnZoom(Number.NaN, 1), 1);    // bad width falls back to base
assert.equal(computeColumnZoom(760, Number.NaN), 2);  // bad textScale treated as 1

console.log('layout-width tests passed');
