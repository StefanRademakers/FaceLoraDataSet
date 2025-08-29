/// <reference types="vitest" />
import { buildZipFromAppState } from '../src/utils/exportZip';
import type { AppState } from '../src/interfaces/AppState';

function makeState(): AppState {
  return {
    version: 1,
    projectName: 'TestProj',
    grids: {
      A: [
        { path: 'http://example.com/a.jpg', caption: 'hello', metadata: { shotType: '', angle: '', lighting: '', environment: '', mood: '', action: '', likeness: { score: 1.0, ref: 'none' } } },
        null,
      ],
      B: [
        { path: 'http://example.com/b.png?cache=1', caption: '', metadata: { shotType: '', angle: '', lighting: '', environment: '', mood: '', action: '', likeness: { score: 1.0, ref: 'none' } } },
      ],
    },
    descriptions: {
      notes: '',
      faceImageDescription: '',
      clothesImageDescription: '',
      fullBodyClothesDescription: '',
      environmentDescription: '',
      loraTrigger: '',
      subjectAddition: '',
    },
    promptTemplate: '',
  };
}

describe('buildZipFromAppState', () => {
  it('includes project.json, images, captions and timestamp', async () => {
    const blobs: Record<string, Blob> = {
      'http://example.com/a.jpg': new Blob([new Uint8Array([1, 2, 3])]),
      'http://example.com/b.png?cache=1': new Blob([new Uint8Array([4, 5])]),
    };
    const fetchFn = async (url: string) => ({ blob: async () => blobs[url] });
    const zip = await buildZipFromAppState(makeState(), fetchFn);
    const files = Object.keys(zip.files);
    expect(files).toContain('project.json');
    expect(files).toContain('a.jpg');
    expect(files).toContain('b.png');
    expect(files).toContain('exported_at.txt');
    // And caption txt for a.jpg
    expect(files).toContain('a.txt');
  });
});
