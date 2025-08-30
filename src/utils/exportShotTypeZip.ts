import JSZip from 'jszip';
import { AppState } from '../interfaces/AppState';

// Export images grouped into shotType folders (close, medium, wide, extreme-close) with captions.
export async function exportShotTypeZip(appState: AppState) {
  const zip = new JSZip();
  const shotFolders = ['extreme-close','close','medium','wide'];
  shotFolders.forEach(sf => zip.folder(sf));
  // Iterate over all images
  for (const images of Object.values(appState.grids)) {
    for (const img of images) {
      if (!img || !img.path) continue;
      const shot = img.metadata?.shotType || 'unknown';
      if (!shotFolders.includes(shot)) continue; // skip unknown shot types
      try {
        const response = await fetch(img.path);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const baseName = img.path.split('/').pop()!.split('?')[0];
        const folder = zip.folder(shot)!;
        folder.file(baseName, new Uint8Array(buffer));
        if (img.caption && img.caption.trim()) {
          folder.file(baseName.replace(/\.[^.]+$/, '.txt'), img.caption.trim());
        }
      } catch {
        // Ignore fetch errors
      }
    }
  }
  // Include a small manifest
  zip.file('manifest.json', JSON.stringify({ project: appState.projectName, generatedAt: new Date().toISOString() }, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const urlObj = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  a.href = urlObj;
  a.download = `${appState.projectName || 'project'}_shotTypes_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(urlObj); }, 100);
}

export default exportShotTypeZip;