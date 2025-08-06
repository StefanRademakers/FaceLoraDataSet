import jsPDF from 'jspdf';

// Helper to load an image as base64 for jsPDF
function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Helper to load an image as base64 and get its natural size
function loadImageAsDataUrlWithSize(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Main export function
export async function exportImagesTabToPDF({
  projectName,
  grids,
  gridConfigs,
  showCaptions,
}: {
  projectName: string;
  grids: Record<string, { path: string; caption: string }[]>;
  gridConfigs: Record<string, { cols: number }>;
  showCaptions: boolean;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(projectName, pageWidth / 2, y, { align: 'center' });
  y += 30;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  for (const [section, images] of Object.entries(grids)) {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(16);
    doc.setTextColor('#1976d2');
    doc.text(section, 40, y);
    y += 20;
    doc.setTextColor('#222');
    doc.setFontSize(12);

    const cols = gridConfigs[section]?.cols || 4;
    const cellSize = Math.floor((pageWidth - 80 - (cols - 1) * 12) / cols);
    let col = 0;
    let rowY = y;
    for (let i = 0; i < images.length; i++) {
      const imgSlot = images[i];
      if (!imgSlot || !imgSlot.path) continue;
      try {
        const { dataUrl, width, height } = await loadImageAsDataUrlWithSize(imgSlot.path);
        // Calculate aspect-fit size
        let drawW = cellSize, drawH = cellSize;
        if (width > 0 && height > 0) {
          const ratio = Math.min(cellSize / width, cellSize / height);
          drawW = width * ratio;
          drawH = height * ratio;
        }
        // Center in cell
        const x = 40 + col * (cellSize + 12) + (cellSize - drawW) / 2;
        const yImg = rowY + (cellSize - drawH) / 2;
        doc.addImage(dataUrl, 'JPEG', x, yImg, drawW, drawH);
      } catch {
        // skip image if it fails to load
      }
      if (showCaptions && imgSlot.caption) {
        doc.setFontSize(10);
        doc.setTextColor('#444');
        doc.text(imgSlot.caption, 40 + col * (cellSize + 12), rowY + cellSize + 12, { maxWidth: cellSize });
        doc.setTextColor('#222');
      }
      col++;
      if (col >= cols) {
        col = 0;
        rowY += cellSize + (showCaptions ? 32 : 16);
        if (rowY > pageHeight - 120) {
          doc.addPage();
          y = 40;
          rowY = y;
        }
      }
    }
    y = rowY + cellSize + (showCaptions ? 32 : 16);
  }
  doc.save(`${projectName || 'images'}.pdf`);
}
