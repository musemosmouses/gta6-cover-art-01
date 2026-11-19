// Wires the page: pick photos, crop and position each panel, choose a
// layout, grade and lettering, then export the cover as a PNG in the common
// post sizes. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js). Everything runs offline: photos are read with
// FileReader / object URLs and never leave the machine.
import { drawCover, exportCover, GRADES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = ['pier', 'boulevard', 'neon', 'palms'];
const SAMPLE_LABELS = { pier: 'Pier', boulevard: 'Boulevard', neon: 'Neon St', palms: 'Palms' };
const SIZES = {
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

const state = {
  layout: 'poster',
  grade: 'sunset',
  title: 'VICE CITY',
  subtitle: 'SUNSET HEIST',
  titleStyle: 'block',
  panels: SAMPLES.map((name) => ({ src: name, img: null, zoom: 1, ox: 0, oy: 0 })),
};
let sizeKey = 'square';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const sizeLabel = document.getElementById('sizelabel');

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const { w, h } = SIZES[sizeKey];
  drawCover(canvas, state, w, h);
  sizeLabel.textContent = `${SIZES[sizeKey].label} — preview`;
}
// One control card per panel: a sample picker, an upload, and zoom /
// horizontal / vertical sliders that crop and position that panel's photo.
function buildPanelControls() {
  const host = document.getElementById('panels');
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel';
    const head = document.createElement('p');
    head.className = 'panel-head';
    head.textContent = `Panel ${i + 1}${i === 0 ? ' — hero' : ''}`;
    card.appendChild(head);

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Panel ${i + 1} sample photo`);
    SAMPLES.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `Sample: ${SAMPLE_LABELS[name]}`;
      select.appendChild(opt);
    });
    const uploadOpt = document.createElement('option');
    uploadOpt.value = 'upload';
    uploadOpt.textContent = 'Your photo…';
    select.appendChild(uploadOpt);
    select.value = panel.src;
    select.addEventListener('change', async () => {
      if (select.value === 'upload') {
        file.click();
        return;
      }
      panel.src = select.value;
      panel.img = await loadImage(`samples/${panel.src}.jpg`);
      redraw();
    });
    card.appendChild(select);

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.setAttribute('aria-label', `Panel ${i + 1} upload a photo`);
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      panel.src = 'upload';
      panel.img = await loadImage(URL.createObjectURL(f));
      redraw();
    });
    card.appendChild(file);

    const sliders = [
      ['zoom', 'Zoom', 1, 2.5, 0.05, (v) => { panel.zoom = v; }],
      ['ox', 'Left / right', -0.3, 0.3, 0.01, (v) => { panel.ox = v; }],
      ['oy', 'Up / down', -0.3, 0.3, 0.01, (v) => { panel.oy = v; }],
    ];
    sliders.forEach(([key, label, min, max, step, apply]) => {
      const row = document.createElement('label');
      row.className = 'slider';
      row.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(key === 'zoom' ? 1 : 0);
      input.setAttribute('aria-label', `Panel ${i + 1} ${label.toLowerCase()}`);
      input.addEventListener('input', () => {
        apply(Number(input.value));
        redraw();
      });
      row.appendChild(input);
      card.appendChild(row);
    });
    host.appendChild(card);
  });
}
// A row of toggle buttons: clicking one marks it `.on`, clears the rest,
// and runs the handler with the button's data value.
function wireToggle(id, attr, apply) {
  const host = document.getElementById(id);
  host.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      host.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      apply(btn.dataset[attr]);
      redraw();
    });
  });
}

function setToggle(id, attr, value) {
  const host = document.getElementById(id);
  host.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset[attr] === value);
  });
}

// Exports one size: renders the cover offscreen at full resolution, then
// downloads the PNG and reports how long the render took.
function exportSize(key) {
  const t0 = performance.now();
  const { w, h } = SIZES[key];
  const off = exportCover(state, w, h);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — the browser could not make the PNG.';
      return;
    }
    const ms = Math.round(performance.now() - t0);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Exported vice-cover-${w}x${h}.png in ${ms} ms.`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function exportAll() {
  Object.keys(SIZES).forEach((key, i) => {
    setTimeout(() => exportSize(key), i * 400);
  });
  status.textContent = 'Exporting all 3 sizes…';
}
// Applies a fixed screenshot scene: the shot's sample goes in the hero
// panel and the other samples fill the rest, so multi-panel layouts show
// four different photos.
async function applyShot(scene) {
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.titleStyle = scene.style;
  sizeKey = scene.size;
  const order = [scene.photo, ...SAMPLES.filter((s) => s !== scene.photo)];
  for (let i = 0; i < state.panels.length; i += 1) {
    state.panels[i].src = order[i];
    state.panels[i].img = await loadImage(`samples/${order[i]}.jpg`);
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
  }
  setToggle('layouts', 'layout', state.layout);
  setToggle('grades', 'grade', state.grade);
  setToggle('styles', 'style', state.titleStyle);
  setToggle('sizes', 'size', sizeKey);
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  redraw();
}

buildPanelControls();
wireToggle('layouts', 'layout', (v) => { state.layout = v; });
wireToggle('grades', 'grade', (v) => { state.grade = v; });
wireToggle('styles', 'style', (v) => { state.titleStyle = v; });
wireToggle('sizes', 'size', (v) => { sizeKey = v; });
document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('export').addEventListener('click', () => exportSize(sizeKey));
document.getElementById('export-all').addEventListener('click', exportAll);

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyShot);
} else {
  (async () => {
    for (let i = 0; i < state.panels.length; i += 1) {
      state.panels[i].img = await loadImage(`samples/${state.panels[i].src}.jpg`);
    }
    redraw();
  })();
}
