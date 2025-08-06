declare global {
  interface Window {
    electronAPI: {
      onFileDrop: (callback: (filePath: string) => void) => () => void;
      onMenuSave: (callback: () => void) => () => void;
      onMenuLoad: (callback: () => void) => () => void;
      saveProject: (state: { projectName: string; grids: any; descriptions: Record<string, string> }) => Promise<{ success: boolean; path?: string }>;
      loadProject: (name?: string) => Promise<{ success: boolean; data?: { projectName: string; grids: any; descriptions: Record<string, string> } }>;
      copyImage: (projectName: string, sourcePath: string, newFileName: string) => Promise<{ success: boolean; path?: string, error?: string }>;
      getProjects: () => Promise<string[]>;
      copyImageToClipboard: (filePath: string) => Promise<{ success: boolean, error?: string }>;
      openImageInExplorer: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      deleteImage: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

// To make this file a module
export {};
