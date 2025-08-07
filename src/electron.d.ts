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
      openFolderInExplorer: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
         getSettings: () => Promise<{ loraDataRoot: string; aiToolkitDatasetsPath: string }>;
         setSettings: (settings: { loraDataRoot: string; aiToolkitDatasetsPath: string }) => void;
      selectDirectory: () => Promise<string | null>;
      getOpenAIKey: () => Promise<string | null>;
      setOpenAIKey: (key: string) => Promise<boolean>;
      autoGenerateCaption: (imagePath: string, token: string, subjectAddition: string) => Promise<string>;
      exportToAiToolkit: (projectName: string, grids: Record<string, { path: string; caption: string }[]>) => Promise<{ success: boolean }>;
    };
  }
}

// To make this file a module
export {};
