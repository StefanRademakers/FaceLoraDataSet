import JSZip from 'jszip';
import { AppState } from '../interfaces/AppState';
import { GRID_SECTION_CONFIGS } from '../config/gridConfig';

interface LoadedImage { img: HTMLImageElement; width: number; height: number; path: string; caption: string; }

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = path;
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, '_');
}

export async function exportGridOverviews(appState: AppState) {
  const zip = new JSZip();
  const folder = zip.folder('grids');
  const maxImagesPerSheet = 15; // split threshold
  const targetWidth = 2048; // exported composite width
  const padding = 24; // outer padding
  const gapX = 16; // horizontal gap between tiles
  const gapY = 32; // vertical gap between tiles (between bottom of caption boxes)
  const bgColor = '#16181a';
  const tileBg = '#22252a';
  const captionColor = '#dddddd';
  const titleColor = '#90caf9';
  const colsForAll = (section: string) => GRID_SECTION_CONFIGS[section]?.cols || 5;
  const font = '14px "Segoe UI", Arial, sans-serif';
  const captionLineHeight = 18;
  const maxCaptionLines = 6;
  const captionBlock = captionLineHeight * maxCaptionLines + 8; // room for lines + small top margin
  const imageBoxHeight = 200; // base height reserved for image (will scale within)
  const tileHeight = imageBoxHeight + captionBlock; // per tile vertical area

  for (const section of Object.keys(GRID_SECTION_CONFIGS)) {
    const slots = appState.grids[section];
    if (!slots) continue;
    const present = slots.filter(s => s && s.path) as { path: string; caption: string }[];
    if (present.length === 0) continue;
    const cols = colsForAll(section);
    // chunk images
    for (let start = 0; start < present.length; start += maxImagesPerSheet) {
      const chunk = present.slice(start, start + maxImagesPerSheet);
      const rows = Math.ceil(chunk.length / cols);
      const tileWidth = Math.floor((targetWidth - (2 * padding) - gapX * (cols - 1)) / cols);
      const height = padding + 48 /*section heading*/ + rows * tileHeight + (rows - 1) * gapY + padding;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // heading
      ctx.fillStyle = titleColor;
      ctx.font = '600 28px "Segoe UI", Arial';
      ctx.textBaseline = 'top';
      ctx.fillText(section, padding, padding);

      ctx.font = font;
      ctx.textBaseline = 'top';
      ctx.fillStyle = captionColor;

      // Preload images sequentially to save memory
      const loaded: (LoadedImage | null)[] = [];
      for (const item of chunk) {
        try {
          const imgEl = await loadImage(item.path.split('?')[0]);
          loaded.push({ img: imgEl, width: imgEl.naturalWidth, height: imgEl.naturalHeight, path: item.path, caption: item.caption || '' });
        } catch {
          loaded.push(null);
        }
      }

      // Draw tiles
      loaded.forEach((entry, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = padding + col * (tileWidth + gapX);
        const y = padding + 48 + row * (tileHeight + gapY);
        // tile bg
        ctx.fillStyle = tileBg;
        ctx.fillRect(x, y, tileWidth, tileHeight);

        if (entry) {
          // fit image inside (tileWidth x imageBoxHeight)
          const boxW = tileWidth;
          const boxH = imageBoxHeight;
            const ratio = Math.min(boxW / entry.width, boxH / entry.height);
            const drawW = Math.max(1, Math.round(entry.width * ratio));
            const drawH = Math.max(1, Math.round(entry.height * ratio));
            const imgX = x + (boxW - drawW) / 2;
            const imgY = y + (boxH - drawH) / 2;
            ctx.drawImage(entry.img, imgX, imgY, drawW, drawH);
          // caption
          const captionY = y + imageBoxHeight + 4;
          const textAreaWidth = tileWidth - 12;
          const wrapped: string[] = [];
          const words = entry.caption.replace(/\r/g,'').split(/\s+/);
          let line = '';
          ctx.font = font;
          for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > textAreaWidth) {
              if (line) wrapped.push(line);
              line = w;
              if (wrapped.length >= maxCaptionLines) break;
            } else {
              line = test;
            }
          }
          if (wrapped.length < maxCaptionLines && line) wrapped.push(line);
          if (wrapped.length === 0) wrapped.push('');
          if (wrapped.length > maxCaptionLines) wrapped.length = maxCaptionLines;
          ctx.fillStyle = captionColor;
          wrapped.forEach((l, i) => {
            ctx.fillText(l, x + 6, captionY + i * captionLineHeight);
          });
        } else {
          ctx.fillStyle = '#555';
          ctx.font = 'italic 14px "Segoe UI", Arial';
          ctx.fillText('Image load failed', x + 8, y + 8);
        }
      });

      // Export this canvas
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b || new Blob()), 'image/jpeg', 0.8));
      const arrBuf = await blob.arrayBuffer();
      const partIndex = Math.floor(start / maxImagesPerSheet) + 1;
      const base = sanitize(section);
      const filename = present.length > maxImagesPerSheet ? `${base}_part${partIndex}.jpg` : `${base}.jpg`;
      folder?.file(filename, arrBuf);
    }
  }

  folder?.file('README.txt', 'Grid overview images generated from project: ' + (appState.projectName || '') + '\nGenerated at: ' + new Date().toISOString());

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  a.href = url;
  a.download = `${appState.projectName || 'project'}_grid_overviews_${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

export default exportGridOverviews;