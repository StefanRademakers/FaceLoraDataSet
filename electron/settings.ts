import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  loraDataRoot: string;
  aiToolkitDatasetsPath: string;
  // Note: OpenAI API key is stored securely via keytar, not in this JSON
  resizeExportImages?: boolean; // whether to resize images on ai-toolkit export (max 1024x1024)
}

const settingsFilePath = path.join(app.getPath('userData'), 'loradataset_settings.json');

const defaultSettings: AppSettings = {
  loraDataRoot: path.join(app.getPath('home'), 'LoraData'),
  aiToolkitDatasetsPath: 'D:\\ai-toolkit\\datasets',
  resizeExportImages: true,
};

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const settingsJson = fs.readFileSync(settingsFilePath, 'utf-8');
      const stored = JSON.parse(settingsJson);
      return { ...defaultSettings, ...stored };
    } else {
      // Create the file with default settings if it doesn't exist
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error reading settings, returning defaults:', error);
    // If there's an error reading or parsing, return defaults
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Securely store and retrieve OpenAI API key
// @ts-ignore: keytar module may not have types
const keytar = require('keytar');
const serviceName = 'MediavibeFaceLoraDataSet';
const accountName = 'openai_api_key';

export async function getOpenAIKey(): Promise<string | null> {
  try {
    return await keytar.getPassword(serviceName, accountName);
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    return null;
  }
}

export async function setOpenAIKey(key: string): Promise<void> {
  try {
    await keytar.setPassword(serviceName, accountName, key);
  } catch (error) {
    console.error('Error setting OpenAI API key:', error);
  }
}
