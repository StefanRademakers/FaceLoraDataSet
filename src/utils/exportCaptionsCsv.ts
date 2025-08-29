import { AppState } from '../interfaces/AppState';
import { GRID_SECTION_CONFIGS } from '../config/gridConfig';

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  let v = value.replace(/"/g, '""');
  return needsQuotes ? `"${v}"` : v;
}

export async function exportCaptionsCsv(appState: AppState) {
  let lines: string[] = [];
  lines.push('index,prompt,image_name');
  const orderedSections = Object.keys(GRID_SECTION_CONFIGS).filter(s => appState.grids[s]);
  let idx = 1;
  for (const section of orderedSections) {
    const slots = appState.grids[section];
    for (const slot of slots) {
      if (!slot) continue;
      const caption = (slot.caption || '').trim();
      if (!caption) continue; // only export populated captions
      // Extract base filename (remove file:// and query "?t=...")
      let baseName = '';
      try {
        const rawPath = slot.path.split('?')[0];
        baseName = rawPath.substring(rawPath.lastIndexOf('/') + 1);
      } catch {}
      lines.push(`${idx},${escapeCsv(caption)},${escapeCsv(baseName)}`);
      idx++;
    }
  }
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  a.download = `${appState.projectName || 'captions'}_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 50);
}

export default exportCaptionsCsv;