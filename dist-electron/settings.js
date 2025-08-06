"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const settingsFilePath = path_1.default.join(electron_1.app.getPath('userData'), 'loradataset_settings.json');
const defaultSettings = {
    loraDataRoot: path_1.default.join(electron_1.app.getPath('home'), 'LoraData'),
};
function getSettings() {
    try {
        if (fs_1.default.existsSync(settingsFilePath)) {
            const settingsJson = fs_1.default.readFileSync(settingsFilePath, 'utf-8');
            return JSON.parse(settingsJson);
        }
        else {
            // Create the file with default settings if it doesn't exist
            fs_1.default.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
            return defaultSettings;
        }
    }
    catch (error) {
        console.error('Error reading settings, returning defaults:', error);
        // If there's an error reading or parsing, return defaults
        return defaultSettings;
    }
}
function saveSettings(settings) {
    try {
        fs_1.default.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    }
    catch (error) {
        console.error('Error saving settings:', error);
    }
}
