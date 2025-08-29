"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIMetadataGenerator = void 0;
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
// Generates structured metadata JSON for an image using OpenAI vision
class OpenAIMetadataGenerator {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    buildPrompt() {
        // Provided template with explicit schema
        return 'You are an annotation assistant. Analyze the given image and return a JSON object using ONLY the allowed values below. Do not invent or combine categories. Always choose one value for each field. Schema: { "shotType": "extreme-close" | "close" | "medium" | "wide", "angle": "frontal" | "three-quarter" | "profile" | "back" | "low-angle" | "high-angle", "lighting": "daylight" | "indoor" | "night" | "sunset" | "studio", "environment": "neutral" | "indoor" | "outdoor" | "nature" | "city" | "sky", "mood": "neutral" | "smiling" | "serious" | "surprised" | "dreamy" | "stern" | "relaxed" | "contemplative", "action": "stand" | "sit" | "walk" | "gesture" | "hold-object" | "interact" | "none" };';
    }
    // Resize proportionally so that width*height <= 500k pixels (0.5 MP)
    async resizeForTokens(originalPath) {
        const img = (0, sharp_1.default)(originalPath);
        const meta = await img.metadata();
        const w = meta.width || 0;
        const h = meta.height || 0;
        if (w === 0 || h === 0) {
            return await img.jpeg({ quality: 70 }).toBuffer();
        }
        const maxPixels = 500_000; // 0.5 MP
        const pixels = w * h;
        if (pixels <= maxPixels) {
            return await img.jpeg({ quality: 70 }).toBuffer();
        }
        const scale = Math.sqrt(maxPixels / pixels);
        const newW = Math.max(1, Math.floor(w * scale));
        const newH = Math.max(1, Math.floor(h * scale));
        return await img.resize(newW, newH, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    }
    async encodeImageBase64(imagePath) {
        const buf = await this.resizeForTokens(imagePath);
        return buf.toString('base64');
    }
    async generateMetadata(imagePath, enableCaching = false) {
        const base64 = await this.encodeImageBase64(imagePath);
        const prompt = this.buildPrompt();
        const cacheDir = path_1.default.join(os_1.default.homedir(), '.facelora_metadata_cache');
        if (!fs_1.default.existsSync(cacheDir))
            fs_1.default.mkdirSync(cacheDir, { recursive: true });
        const hash = crypto_1.default.createHash('md5').update(imagePath + '|' + prompt).digest('hex');
        const cacheFile = path_1.default.join(cacheDir, `${hash}.json`);
        if (enableCaching && fs_1.default.existsSync(cacheFile)) {
            try {
                return JSON.parse(await fs_1.default.promises.readFile(cacheFile, 'utf-8'));
            }
            catch { /* ignore */ }
        }
        const maxRetries = 3;
        let lastErr;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o',
                    messages: [
                        { role: 'user', content: [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                            ] }
                    ],
                    temperature: 0.0,
                }, {
                    headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
                });
                const raw = response.data.choices[0]?.message?.content?.trim() || '{}';
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                }
                catch (e) {
                    // Try to extract JSON substring
                    const match = raw.match(/\{[\s\S]*\}/);
                    if (match) {
                        try {
                            parsed = JSON.parse(match[0]);
                        }
                        catch {
                            parsed = {};
                        }
                    }
                    else {
                        parsed = {};
                    }
                }
                // Basic normalization ensure all keys exist
                const normalized = {
                    shotType: parsed.shotType || '',
                    angle: parsed.angle || '',
                    lighting: parsed.lighting || '',
                    environment: parsed.environment || '',
                    mood: parsed.mood || '',
                    action: parsed.action || '',
                    likeness: { score: 1.0, ref: 'none' },
                };
                try {
                    await fs_1.default.promises.writeFile(cacheFile, JSON.stringify(normalized));
                }
                catch { }
                return normalized;
            }
            catch (err) {
                lastErr = err;
                const status = err?.response?.status;
                if (status === 429 && attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                    continue;
                }
                break;
            }
        }
        throw new Error('Failed to generate metadata: ' + (lastErr?.message || lastErr));
    }
}
exports.OpenAIMetadataGenerator = OpenAIMetadataGenerator;
exports.default = OpenAIMetadataGenerator;
