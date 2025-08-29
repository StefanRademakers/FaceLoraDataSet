import React from 'react';
import { AppState } from '../../interfaces/AppState';

interface DatasetCheckTabProps {
  appState: AppState;
}

// Simple initial dataset quality summary; will expand with checks.
const DatasetCheckTab: React.FC<DatasetCheckTabProps> = ({ appState }) => {
  let imageCount = 0;
  let captioned = 0;
  let withFullMetadata = 0;
  for (const images of Object.values(appState.grids)) {
    for (const slot of images) {
      if (!slot) continue;
      imageCount++;
      if (slot.caption && slot.caption.trim()) captioned++;
      const m = slot.metadata;
      if (m && m.shotType && m.angle && m.lighting && m.environment && m.mood && m.action) withFullMetadata++;
    }
  }
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dataset Check</h2>
      <div className="grid grid-cols-2 gap-6 max-w-3xl">
        <div className="p-4 rounded bg-[#262b30] border border-[#3a4045]">
          <div className="text-sm opacity-70 mb-1">Total Images</div>
          <div className="text-xl font-semibold">{imageCount}</div>
        </div>
        <div className="p-4 rounded bg-[#262b30] border border-[#3a4045]">
          <div className="text-sm opacity-70 mb-1">Captioned</div>
          <div className="text-xl font-semibold">{captioned} <span className="text-xs opacity-60">({imageCount?Math.round(captioned/imageCount*100):0}%)</span></div>
        </div>
        <div className="p-4 rounded bg-[#262b30] border border-[#3a4045]">
          <div className="text-sm opacity-70 mb-1">Complete Metadata</div>
          <div className="text-xl font-semibold">{withFullMetadata} <span className="text-xs opacity-60">({imageCount?Math.round(withFullMetadata/imageCount*100):0}%)</span></div>
        </div>
        <div className="p-4 rounded bg-[#262b30] border border-[#3a4045]">
          <div className="text-sm opacity-70 mb-1">Images Missing Metadata</div>
          <div className="text-xl font-semibold">{imageCount - withFullMetadata}</div>
        </div>
      </div>
      <hr className="border-[#333]" />
      <section>
        <h3 className="text-lg font-semibold mb-2">Next Checks (planned)</h3>
        <ul className="list-disc ml-6 text-sm opacity-80 space-y-1">
          <li>Distribution balance (shot types, angles, lighting, etc.)</li>
          <li>Duplicate detection (perceptual hash)</li>
          <li>Likeness variance once insightface integrated</li>
          <li>Outlier detection for caption length</li>
        </ul>
      </section>
    </div>
  );
};

export default DatasetCheckTab;