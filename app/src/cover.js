// Vice Cover Studio — the cover engine.
// Draws a multi-panel GTA 6-style poster cover onto a canvas: photos in
// panels, a Vice City sunset/neon colour grade, a retro sun disc, and bold
// tracked-out lettering. Pure canvas 2D, no network, no clock, no random:
// the same state and size always paint the same pixels.

// Colour grades: a top wash, a bottom wash, the sun-disc ramp, the title
// gradient, and the glow colour used by the neon lettering style.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    top: 'rgba(255, 170, 80, 0.10)',
    bottom: 'rgba(255, 60, 140, 0.30)',
    sun: ['#ffd166', '#ff5e7a', '#c026d3'],
    titleTop: '#fff7e0',
    titleBottom: '#ffb347',
    glow: '#ff2e88',
  },
  neon: {
    label: 'Neon Nights',
    top: 'rgba(0, 229, 255, 0.16)',
    bottom: 'rgba(255, 0, 128, 0.28)',
    sun: ['#7df9ff', '#00c2ff', '#ff00a8'],
    titleTop: '#eaffff',
    titleBottom: '#00e5ff',
    glow: '#00e5ff',
  },
  noir: {
    label: 'Palm Noir',
    top: 'rgba(8, 30, 40, 0.22)',
    bottom: 'rgba(4, 12, 20, 0.42)',
    sun: ['#e8e4d8', '#b8c4c4', '#5a7a8a'],
    titleTop: '#ffffff',
    titleBottom: '#c8d4d4',
    glow: '#9fd8e8',
  },
  gold: {
    label: 'Golden Hour',
    top: 'rgba(255, 200, 90, 0.14)',
    bottom: 'rgba(180, 90, 0, 0.24)',
    sun: ['#fff3b0', '#ffb347', '#ff7b00'],
    titleTop: '#fffbe8',
    titleBottom: '#ffc233',
    glow: '#ff9d00',
  },
};
// Panel layouts as fractions of the cover. Poster is the GTA cover look:
// one hero panel over two small panels. Split is two tall panels, grid is
// four quarters, single is one full-bleed photo.
export function layoutPanels(layout, W, H) {
  const g = Math.max(3, Math.round(W * 0.006)); // gutter between panels
  if (layout === 'split') {
    return [
      { x: 0, y: 0, w: W / 2 - g / 2, h: H },
      { x: W / 2 + g / 2, y: 0, w: W / 2 - g / 2, h: H },
    ];
  }
  if (layout === 'grid') {
    return [
      { x: 0, y: 0, w: W / 2 - g / 2, h: H / 2 - g / 2 },
      { x: W / 2 + g / 2, y: 0, w: W / 2 - g / 2, h: H / 2 - g / 2 },
      { x: 0, y: H / 2 + g / 2, w: W / 2 - g / 2, h: H / 2 - g / 2 },
      { x: W / 2 + g / 2, y: H / 2 + g / 2, w: W / 2 - g / 2, h: H / 2 - g / 2 },
    ];
  }
  if (layout === 'single') return [{ x: 0, y: 0, w: W, h: H }];
  const heroH = Math.round(H * 0.62);
  return [
    { x: 0, y: 0, w: W, h: heroH - g / 2 },
    { x: 0, y: heroH + g / 2, w: W / 2 - g / 2, h: H - heroH - g / 2 },
    { x: W / 2 + g / 2, y: heroH + g / 2, w: W / 2 - g / 2, h: H - heroH - g / 2 },
  ];
}

// Draws one panel: the photo cover-fit with the panel's zoom and offsets,
// then the grade wash over it. An empty panel paints a flat dusk purple.
function drawPanel(ctx, panel, photo, grade) {
  const { x, y, w, h } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo && photo.img) {
    const zoom = photo.zoom || 1;
    const scale = Math.max(w / photo.img.naturalWidth, h / photo.img.naturalHeight) * zoom;
    const pw = photo.img.naturalWidth * scale;
    const ph = photo.img.naturalHeight * scale;
    const cx = x + w / 2 + (photo.ox || 0) * w;
    const cy = y + h / 2 + (photo.oy || 0) * h;
    ctx.drawImage(photo.img, cx - pw / 2, cy - ph / 2, pw, ph);
  } else {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x, y, w, h);
  }
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
// A retro sun disc: a gradient circle with cut lines across its lower
// half, drawn with canvas primitives so no artwork asset is needed.
function drawSun(ctx, cx, cy, r, colors) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(20, 6, 32, 0.55)';
  const cuts = [0.08, 0.26, 0.48];
  cuts.forEach((f, i) => {
    const y = cy + r * f;
    ctx.fillRect(cx - r, y, r * 2, Math.max(2, r * (0.03 + i * 0.02)));
  });
  ctx.restore();
}

// Darkens the cover edges so the lettering reads on any photo.
function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.72,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
// Shrinks a bold title font until the text fits maxWidth. letterSpacing is
// set by the caller first, so the measure includes the tracking.
function fitTitleFont(ctx, text, maxWidth, startSize, spacing) {
  let size = startSize;
  const set = (s) => {
    ctx.font = `900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  };
  set(size);
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    set(size);
  }
  return size;
}

// The lettering: a dark scrim across the foot, the tracked-out subtitle,
// then the big title in one of three styles — block (gradient fill with a
// dark outline), outline (white stroke only), or neon (white fill, glow).
function drawTitle(ctx, state, W, H, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const scrim = ctx.createLinearGradient(0, H * 0.68, 0, H);
  scrim.addColorStop(0, 'rgba(12, 4, 24, 0)');
  scrim.addColorStop(1, 'rgba(12, 4, 24, 0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.68, W, H * 0.32);
  const cx = W / 2;
  let baseline = H * 0.93;
  if (subtitle) {
    const subSize = Math.max(14, Math.round(H * 0.028));
    ctx.font = `700 ${subSize}px "Helvetica Neue", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(subtitle, cx, baseline);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    baseline -= subSize * 1.9;
  }
  if (!title) return;
  const spacing = Math.round(H * 0.115 * 0.02);
  try { ctx.letterSpacing = `${spacing}px`; } catch { /* older canvas */ }
  const size = fitTitleFont(ctx, title, W * 0.92, Math.round(H * 0.115), spacing);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  grad.addColorStop(0, grade.titleTop);
  grad.addColorStop(1, grade.titleBottom);
  if (state.titleStyle === 'outline') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = size * 0.25;
    ctx.strokeText(title, cx, baseline);
  } else if (state.titleStyle === 'neon') {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = size * 0.4;
    ctx.fillText(title, cx, baseline);
    ctx.fillText(title, cx, baseline);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(20, 6, 32, 0.85)';
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.strokeText(title, cx, baseline);
  } else {
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.strokeStyle = 'rgba(20, 6, 32, 0.9)';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeText(title, cx, baseline);
    ctx.fillText(title, cx, baseline);
  }
  ctx.shadowBlur = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}
// Draws the whole cover onto `canvas` at W x H. `state` is:
// { layout, grade, title, subtitle, titleStyle, panels: [{img, zoom, ox, oy}] }
// Panels are painted in order; the sun sits over the hero panel on poster
// and single layouts; the title sits over the foot of every layout.
export function drawCover(canvas, state, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#0d0817';
  ctx.fillRect(0, 0, W, H);
  const panels = layoutPanels(state.layout || 'poster', W, H);
  panels.forEach((rect, i) => {
    drawPanel(ctx, rect, (state.panels || [])[i] || null, grade);
  });
  if (state.layout === 'poster' || state.layout === 'single' || !state.layout) {
    const hero = panels[0];
    const r = Math.round(Math.min(hero.w, hero.h) * 0.17);
    drawSun(ctx, hero.x + hero.w * 0.72, hero.y + hero.h * 0.30, r, grade.sun);
  }
  drawVignette(ctx, W, H);
  drawTitle(ctx, state, W, H, grade);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

// Renders the cover onto a fresh offscreen canvas at W x H for export.
export function exportCover(state, W, H) {
  const canvas = document.createElement('canvas');
  drawCover(canvas, state, W, H);
  return canvas;
}
