import JSZip from 'jszip';

export async function exportProjectToZip({
  projectName,
  grids,
  descriptions
}: {
  projectName: string;
  grids: Record<string, { path: string; caption: string }[]>;
  descriptions: any;
}) {
  const zip = new JSZip();

  // Add project JSON
  const projectJson = JSON.stringify({ projectName, grids, descriptions }, null, 2);
  zip.file('project.json', projectJson);

  // Add images and captions
  for (const [section, images] of Object.entries(grids)) {
    for (const img of images) {
      if (!img || !img.path) continue;
      try {
        // Fetch image as blob
        const response = await fetch(img.path);
        const blob = await response.blob();
        // Get filename from path
        const urlParts = img.path.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        // Add image to zip (in section folder)
        const sectionFolder = zip.folder(section) || zip;
        sectionFolder.file(filename, blob);
        // Add caption as .txt if present
        if (img.caption && img.caption.trim()) {
          sectionFolder.file(filename.replace(/\.[^.]+$/, '.txt'), img.caption);
        }
      } catch {
        // skip if fetch fails
      }
    }
  }

  // Generate zip and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'project'}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
