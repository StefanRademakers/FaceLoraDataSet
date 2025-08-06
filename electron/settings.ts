import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  loraDataRoot: string;
}

const settingsFilePath = path.join(app.getPath('userData'), 'loradataset_settings.json');

const defaultSettings: AppSettings = {
  loraDataRoot: path.join(app.getPath('home'), 'LoraData'),
};

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const settingsJson = fs.readFileSync(settingsFilePath, 'utf-8');
      return JSON.parse(settingsJson);
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
