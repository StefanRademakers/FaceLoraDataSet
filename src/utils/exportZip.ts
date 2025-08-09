import JSZip from 'jszip';
import { AppState } from '../interfaces/AppState';

// Pure helper for tests: build a JSZip instance from AppState using an injected fetch function
export async function buildZipFromAppState(
  appState: AppState,
  fetchFn: (url: string) => Promise<{ blob(): Promise<Blob> }>
) {
  const zip = new JSZip();
  zip.file('project.json', JSON.stringify(appState, null, 2));
  for (const images of Object.values(appState.grids)) {
    for (const img of images) {
      if (!img || !img.path) continue;
      try {
        const response = await fetchFn(img.path);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
        const urlParts = img.path.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
  zip.file(filename, new Uint8Array(buffer));
        if (img.caption && img.caption.trim()) {
          zip.file(filename.replace(/\.[^.]+$/, '.txt'), img.caption.trim());
        }
      } catch {
        // Skip if fetch fails
      }
    }
  }
  zip.file('exported_at.txt', `Exported at: ${new Date().toISOString()}`);
  return zip;
}

export async function exportProjectToZip(appState: AppState) {
  const zip = await buildZipFromAppState(appState, (u) => fetch(u));
  const content = await zip.generateAsync({ type: 'blob' });
  const urlObj = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = urlObj;
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  a.download = `${appState.projectName || 'project'}_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  }, 100);
}
