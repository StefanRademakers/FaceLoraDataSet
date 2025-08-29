/// <reference types="vitest" />
import { toRelativeGrids, toAbsoluteGrids } from '../src/utils/pathTransforms';
import type { GridMap } from '../src/utils/pathTransforms';

// Helper: build file:// URL for tests that works cross-platform
function fileUrl(p: string) {
  const prefix = process.platform === 'win32' ? 'file:///' : 'file://';
  return `${prefix}${p.replace(/\\/g, '/')}`;
}

describe('pathTransforms', () => {
  it('converts file:// absolute paths to project-relative', () => {
    const projectDir = process.platform === 'win32' ? 'C:/data/myproj' : '/data/myproj';
    const abs = process.platform === 'win32' ? 'C:/data/myproj/imgs/a.jpg' : '/data/myproj/imgs/a.jpg';
    const grids: GridMap = {
      Section1: [
        { path: fileUrl(abs), caption: 'c1', metadata: { shotType: '', angle: '', lighting: '', environment: '', mood: '', action: '', likeness: { score: 1.0, ref: 'none' } } },
        null,
      ],
    } as any;
    const rel = toRelativeGrids(grids, projectDir);
    expect(rel.Section1?.[0]?.path).toBe('imgs/a.jpg');
  });

  it('converts relative to absolute based on project dir', () => {
    const projectDir = process.platform === 'win32' ? 'C:/data/myproj' : '/data/myproj';
    const grids: GridMap = {
      Section1: [
        { path: 'imgs/a.jpg', caption: '', metadata: { shotType: '', angle: '', lighting: '', environment: '', mood: '', action: '', likeness: { score: 1.0, ref: 'none' } } },
      ],
    } as any;
    const abs = toAbsoluteGrids(grids, projectDir);
    expect(abs.Section1?.[0]?.path).toContain('imgs');
    expect(abs.Section1?.[0]?.path).toContain('a.jpg');
  });
});
