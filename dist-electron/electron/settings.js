"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
exports.getOpenAIKey = getOpenAIKey;
exports.setOpenAIKey = setOpenAIKey;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const settingsFilePath = path_1.default.join(electron_1.app.getPath('userData'), 'loradataset_settings.json');
const defaultSettings = {
    loraDataRoot: path_1.default.join(electron_1.app.getPath('home'), 'LoraData'),
    aiToolkitDatasetsPath: 'D:\\ai-toolkit\\datasets',
    resizeExportImages: true,
};
function getSettings() {
    try {
        if (fs_1.default.existsSync(settingsFilePath)) {
            const settingsJson = fs_1.default.readFileSync(settingsFilePath, 'utf-8');
            const stored = JSON.parse(settingsJson);
            return { ...defaultSettings, ...stored };
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
// Securely store and retrieve OpenAI API key
// @ts-ignore: keytar module may not have types
const keytar = require('keytar');
const serviceName = 'MediavibeFaceLoraDataSet';
const accountName = 'openai_api_key';
async function getOpenAIKey() {
    try {
        return await keytar.getPassword(serviceName, accountName);
    }
    catch (error) {
        console.error('Error getting OpenAI API key:', error);
        return null;
    }
}
async function setOpenAIKey(key) {
    try {
        await keytar.setPassword(serviceName, accountName, key);
    }
    catch (error) {
        console.error('Error setting OpenAI API key:', error);
    }
}
