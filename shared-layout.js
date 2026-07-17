(function (root) {
  const DEFAULT_VISIBLE_COLUMNS = 4;
  const MIN_FITTED_COLUMN_WIDTH = 120;
  const ZOOM_BASE_COLUMN_WIDTH = 380;
  // Electron's accepted zoom-factor range.
  const MIN_ZOOM_FACTOR = 0.25;
  const MAX_ZOOM_FACTOR = 5;

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

  // Proportional zoom: a column always lays out as a ZOOM_BASE_COLUMN_WIDTH
  // viewport, then scales to fill its actual width. textScale (Ctrl+/-)
  // multiplies on top as a pure text-size control; it never resizes columns.
  function computeColumnZoom(columnWidth, textScale, baseWidth) {
    const base = Number.isFinite(baseWidth) && baseWidth > 0
      ? baseWidth
      : ZOOM_BASE_COLUMN_WIDTH;
    const scale = Number.isFinite(textScale) && textScale > 0 ? textScale : 1;
    const width = Number.isFinite(columnWidth) && columnWidth > 0 ? columnWidth : base;
    const zoom = (width / base) * scale;
    return Math.min(MAX_ZOOM_FACTOR, Math.max(MIN_ZOOM_FACTOR, zoom));
  }

  const api = {
    DEFAULT_VISIBLE_COLUMNS,
    MIN_FITTED_COLUMN_WIDTH,
    ZOOM_BASE_COLUMN_WIDTH,
    computeFittedColumnWidth,
    computeColumnZoom,
  };

  root.XDeckLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
