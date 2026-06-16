(function (root) {
  const DEFAULT_VISIBLE_COLUMNS = 4;
  const MIN_FITTED_COLUMN_WIDTH = 120;

  function computeFittedColumnWidth(availableWidth, visibleColumns, minWidth) {
    const cols = Number.isFinite(visibleColumns) && visibleColumns > 0
      ? Math.floor(visibleColumns)
      : DEFAULT_VISIBLE_COLUMNS;
    const floor = Number.isFinite(minWidth) && minWidth > 0
      ? Math.floor(minWidth)
      : MIN_FITTED_COLUMN_WIDTH;
    const width = Number.isFinite(availableWidth) && availableWidth > 0
      ? Math.floor(availableWidth / cols)
      : 0;
    return Math.max(floor, width);
  }

  const api = {
    DEFAULT_VISIBLE_COLUMNS,
    MIN_FITTED_COLUMN_WIDTH,
    computeFittedColumnWidth,
  };

  root.XDeckLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
