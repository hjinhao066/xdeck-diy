// Injected into every column's page. Intercepts clicks on tweet photos and
// asks the host (deck) page to show them in a window-wide lightbox instead of
// X's own lightbox, which is confined to the column width.
const { ipcRenderer } = require('electron');

function findTweetPhoto(target) {
  if (!target || !target.closest) return null;
  // X renders tweet photos as <img src="https://pbs.twimg.com/media/...">,
  // sometimes wrapped in a [data-testid="tweetPhoto"] container with overlays.
  const photo = target.closest('[data-testid="tweetPhoto"]');
  const img = photo ? photo.querySelector('img') : target.closest('img');
  // Only real tweet photos (/media/). This leaves avatars, link-card previews
  // and video/GIF thumbnails (ext_tw_video_thumb, tweet_video_thumb) alone.
  if (img && img.src && img.src.includes('pbs.twimg.com/media/')) return img;
  return null;
}

window.addEventListener('click', (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const img = findTweetPhoto(e.target);
  if (!img) return;
  e.preventDefault();
  e.stopPropagation();
  ipcRenderer.sendToHost('open-image', img.src);
}, true);
