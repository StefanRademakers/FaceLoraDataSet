// Utility to build canonical project.json string for export/backup
export interface ProjectJson {
  projectName: string;
  grids: Record<string, any>;
  descriptions: any;
}

export function buildProjectJson({ projectName, grids, descriptions }: ProjectJson): string {
  return JSON.stringify({ projectName, grids, descriptions }, null, 2);
}
