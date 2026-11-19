// Fixed scenes for screenshots: ?shot=cover shows the cover alone, filling
// the viewport; ?shot=editor shows the full studio with a sample loaded.
// Query params: photo (sample), layout, grade, title, subtitle, style,
// size (square | portrait | wide). window.__shotReady is set once painted.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply({
    photo: query.get('photo') || 'pier',
    layout: query.get('layout') || 'poster',
    grade: query.get('grade') || 'sunset',
    title: query.get('title') || 'VICE CITY',
    subtitle: query.get('subtitle') || 'SUNSET HEIST',
    style: query.get('style') || 'block',
    size: query.get('size') || 'square',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
