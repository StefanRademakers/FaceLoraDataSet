import JSZip from 'jszip';
import { AppState } from '../interfaces/AppState';
import { GRID_SECTION_CONFIGS } from '../config/gridConfig';

interface ProcessedImage {
  filename: string;
  section: string;
  caption: string;
  index: number; // global index for navigation
  blob: Blob;
}

async function loadAndProcessImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function sanitizeBaseName(path: string) {
  const base = path.split('/').pop() || 'image.jpg';
  // remove query
  const clean = base.split('?')[0];
  return clean.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function exportStaticHtml(appState: AppState) {
  const zip = new JSZip();
  const imagesDir = zip.folder('images');
  const processed: ProcessedImage[] = [];
  let globalIndex = 0;
  const maxDim = 2048;

  // Track used filenames to avoid duplicates
  const usedNames: Record<string, number> = {};

  for (const [section, slots] of Object.entries(appState.grids)) {
    for (const slot of slots) {
      if (!slot || !slot.path) continue;
      try {
        let fileUrl = slot.path;
        if (fileUrl.startsWith('file://')) {
          // Browser fetch can still load file://? Instead, use <img> direct; but we already load via Image using path.
          // Leave as-is; the <img> can load it while running inside app; for static export we re-encode below.
        }
        const imgEl = await loadAndProcessImage(fileUrl);
        let { width, height } = imgEl;
        let targetW = width;
        let targetH = height;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
            targetW = Math.round(width * scale);
            targetH = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.drawImage(imgEl, 0, 0, targetW, targetH);
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.8));
        let baseName = sanitizeBaseName(fileUrl).replace(/\.[^.]+$/, '.jpg');
        if (usedNames[baseName]) {
          const c = ++usedNames[baseName];
          const without = baseName.replace(/\.[^.]+$/, '');
          baseName = `${without}_${c}.jpg`;
        } else {
          usedNames[baseName] = 1;
        }
        imagesDir?.file(baseName, await blob.arrayBuffer());
        processed.push({
          filename: baseName,
          section,
          caption: slot.caption || '',
          index: globalIndex++,
          blob,
        });
      } catch (e) {
        console.warn('Static export: skip image', slot?.path, e);
      }
    }
  }

  // Group by section preserving original order from GRID_SECTION_CONFIGS ordering
  const orderedSections = Object.keys(GRID_SECTION_CONFIGS).filter(s => appState.grids[s]);
  const sectionMap: Record<string, ProcessedImage[]> = {};
  for (const sec of orderedSections) sectionMap[sec] = [];
  for (const p of processed) sectionMap[p.section]?.push(p);

  const css = `body{background:#121212;color:#eee;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:32px;}\n
  h1{color:#90caf9;margin-top:0;font-size:28px;}\n
  h2{color:#90caf9;margin:40px 0 16px;font-size:20px;}\n
  .section{margin-bottom:24px;}\n
  .grid{display:grid;gap:16px;}\n
  figure{background:#1e1e1e;margin:0;padding:8px;border-radius:8px;display:flex;flex-direction:column;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.6);}\n
  figure img{max-width:100%;height:auto;object-fit:contain;cursor:pointer;border-radius:4px;}\n
  figcaption{margin-top:8px;font-size:12px;line-height:1.4;color:#bbb;white-space:pre-wrap;width:100%;word-break:break-word;}\n
  #overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:999;}\n
  #overlay.open{display:flex;}\n
  #overlay img{max-width:95vw;max-height:80vh;object-fit:contain;box-shadow:0 0 12px rgba(0,0,0,.8);}\n
  #overlay .caption{margin-top:16px;max-width:90vw;font-size:14px;color:#ddd;white-space:pre-wrap;}\n
  #closeBtn{position:absolute;top:16px;right:24px;color:#fff;font-size:32px;cursor:pointer;font-weight:600;}\n
  .navHint{position:absolute;bottom:12px;right:20px;font-size:11px;color:#888;}\n`;

  const script = `(()=>{\n  const tiles=[...document.querySelectorAll('[data-idx]')];\n  const overlay=document.getElementById('overlay');\n  const ovImg=document.getElementById('ovImg');\n  const ovCap=document.getElementById('ovCap');\n  const closeBtn=document.getElementById('closeBtn');\n  let current=-1;\n  function open(i){current=i;const t=tiles[i];if(!t)return;ovImg.src=t.getAttribute('data-src');ovCap.textContent=t.getAttribute('data-caption')||'';overlay.classList.add('open');document.body.style.overflow='hidden';}\n  function close(){overlay.classList.remove('open');document.body.style.overflow='auto';}\n  function step(dir){if(current<0)return;let n=(current+dir+tiles.length)%tiles.length;open(n);}\n  tiles.forEach(t=>t.addEventListener('click',()=>open(parseInt(t.getAttribute('data-idx')))));\n  closeBtn.addEventListener('click',close);\n  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});\n  window.addEventListener('keydown',e=>{if(!overlay.classList.contains('open'))return; if(e.key==='Escape')close(); else if(e.key==='ArrowRight')step(1); else if(e.key==='ArrowLeft')step(-1);});\n})();`;

  const htmlParts: string[] = [];
  htmlParts.push('<!DOCTYPE html><html><head><meta charset="utf-8" />');
  htmlParts.push(`<title>${(appState.projectName || 'Dataset').replace(/</g, '&lt;')}</title>`);
  htmlParts.push('<meta name="viewport" content="width=device-width,initial-scale=1" />');
  htmlParts.push('<style>' + css + '</style>');
  htmlParts.push('</head><body>');
  htmlParts.push(`<h1>${(appState.projectName || 'Dataset').replace(/</g, '&lt;')}</h1>`);

  for (const section of orderedSections) {
    const imgs = sectionMap[section];
    if (!imgs || imgs.length === 0) continue;
    const cols = GRID_SECTION_CONFIGS[section]?.cols || 5;
    htmlParts.push(`<div class="section"><h2>${section.replace(/</g,'&lt;')}</h2>`);
    htmlParts.push(`<div class="grid" style="grid-template-columns:repeat(${cols},1fr)">`);
    for (const p of imgs) {
      const captionEsc = p.caption.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      htmlParts.push(`<figure data-idx="${p.index}" data-src="images/${p.filename}" data-caption="${captionEsc}">` +
        `<img src="images/${p.filename}" alt="" />` +
        (p.caption ? `<figcaption>${captionEsc}</figcaption>` : '') +
        `</figure>`);
    }
    htmlParts.push('</div></div>');
  }

  // Overlay viewer
  htmlParts.push('<div id="overlay"><span id="closeBtn">×</span><img id="ovImg" alt="" /><div class="caption" id="ovCap"></div><div class="navHint">Esc / ← →</div></div>');
  htmlParts.push('<script>' + script + '</script>');
  htmlParts.push('</body></html>');

  const html = htmlParts.join('\n');
  zip.file('index.html', html);
  zip.file('project.json', JSON.stringify(appState, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const urlObj = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  a.href = urlObj;
  a.download = `${appState.projectName || 'dataset'}_static_html_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(urlObj);},100);
}

export default exportStaticHtml;