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
  // Maximum dimension (width or height) for exported images; increased from 2048 to 3072 per request
  const maxDim = 3072;

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
  #overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:999;padding:32px;box-sizing:border-box;}\n
  #overlay.open{display:flex;}\n
  #overlay .viewer{position:relative;display:flex;flex-direction:column;align-items:center;max-width:100%;max-height:100%;width:100%;height:100%;justify-content:center;}\n
  #overlay img{max-width:100%;max-height:90vh;object-fit:contain;box-shadow:0 0 12px rgba(0,0,0,.8);margin:0 auto;}\n
  #overlay .caption{margin-top:12px;max-width:100%;font-size:14px;color:#ddd;white-space:pre-wrap;text-align:center;overflow:auto;}\n
  #closeBtn{position:absolute;top:16px;right:24px;color:#fff;font-size:32px;cursor:pointer;font-weight:600;line-height:1;}\n
  #openNewTab{position:absolute;top:20px;right:70px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;color:#fff;background:rgba(255,255,255,0.12);border-radius:6px;text-decoration:none;cursor:pointer;backdrop-filter:blur(4px);transition:background .15s;}\n
  #openNewTab:hover{background:rgba(255,255,255,0.25);}\n
  #openNewTab svg{width:16px;height:16px;stroke:#fff;stroke-width:2;fill:none;}\n
  .navHint{position:absolute;bottom:12px;right:20px;font-size:11px;color:#888;}\n`;

  const script = `(()=>{\n  const tiles=[...document.querySelectorAll('[data-idx]')];\n  const overlay=document.getElementById('overlay');\n  const ovImg=document.getElementById('ovImg');\n  const ovCap=document.getElementById('ovCap');\n  const closeBtn=document.getElementById('closeBtn');\n  const openBtn=document.getElementById('openNewTab');\n  let current=-1;\n  let scale=1, tx=0, ty=0;\n  let dragging=false, lastX=0, lastY=0;\n  function applyTransform(){ovImg.style.transform=\`translate(\${tx}px,\${ty}px) scale(\${scale})\`;ovImg.style.cursor= scale>1 ? (dragging?'grabbing':'grab') : 'default';}\n  function resetTransform(){scale=1;tx=0;ty=0;applyTransform();}\n  function open(i){current=i;const t=tiles[i];if(!t)return;const src=t.getAttribute('data-src');resetTransform();ovImg.src=src;ovCap.textContent=t.getAttribute('data-caption')||'';openBtn.setAttribute('href',src);overlay.classList.add('open');document.body.style.overflow='hidden';}\n  function close(){overlay.classList.remove('open');document.body.style.overflow='auto';resetTransform();}\n  function step(dir){if(current<0)return;let n=(current+dir+tiles.length)%tiles.length;open(n);}\n  tiles.forEach(t=>t.addEventListener('click',()=>open(parseInt(t.getAttribute('data-idx')))));\n  closeBtn.addEventListener('click',close);\n  openBtn.addEventListener('click',e=>{e.stopPropagation();});\n  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});\n  window.addEventListener('keydown',e=>{if(!overlay.classList.contains('open'))return; if(e.key==='Escape')close(); else if(e.key==='ArrowRight')step(1); else if(e.key==='ArrowLeft')step(-1);});\n  // Zoom with wheel\n  ovImg.addEventListener('wheel',e=>{e.preventDefault(); const rect=ovImg.getBoundingClientRect(); const cx=e.clientX-(rect.left+rect.width/2); const cy=e.clientY-(rect.top+rect.height/2); const prev=scale; const factor=e.deltaY<0?1.12:0.9; scale=Math.min(8,Math.max(1,scale*factor)); const ratio=scale/prev; tx = tx + cx - cx*ratio; ty = ty + cy - cy*ratio; applyTransform();},{passive:false});\n  // Drag to pan with button guard and pointer capture fallback\n  ovImg.addEventListener('mousedown',e=>{ if(scale<=1 || e.button!==0) return; dragging=true; lastX=e.clientX; lastY=e.clientY; try{ ovImg.setPointerCapture(e.pointerId); }catch(_){} applyTransform(); });\n  window.addEventListener('mousemove',e=>{ if(!dragging) return; // if no buttons pressed, abort drag (lost mouseup)\n    if(e.buttons===0){ dragging=false; applyTransform(); return;} const dx=e.clientX-lastX; const dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; tx+=dx; ty+=dy; applyTransform(); });\n  function endDrag(e){ if(!dragging) return; dragging=false; try{ ovImg.releasePointerCapture(e.pointerId); }catch(_){} applyTransform(); }\n  window.addEventListener('mouseup',endDrag);\n  ovImg.addEventListener('mouseleave',e=>{ /* If mouse leaves while not pressed ignore; if leaves while pressed keep drag until mouseup */});\n  // Double click to reset\n  ovImg.addEventListener('dblclick', e=>{ e.preventDefault(); resetTransform(); });\n})();`;

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
  htmlParts.push('<div id="overlay"><span id="closeBtn">×</span><a id="openNewTab" href="#" target="_blank" title="Open image in new tab" aria-label="Open image in new tab">'+
    '<svg viewBox="0 0 24 24"><path d="M7 7h10v10M7 17 17 7"/></svg></a><div class="viewer"><img id="ovImg" alt="" /><div class="caption" id="ovCap"></div></div><div class="navHint">Esc / ← →</div></div>');
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