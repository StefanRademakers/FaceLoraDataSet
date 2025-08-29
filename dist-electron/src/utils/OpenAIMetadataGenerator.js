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
        // Enhanced prompt with explicit definitions (especially shotType) and strict JSON response requirement
        return `You are an annotation assistant. Analyze the supplied image and return ONLY a raw JSON object (no markdown, no code fences, no explanation) that conforms EXACTLY to this schema:
{
  "shotType": "extreme-close" | "close" | "medium" | "wide",
  "angle": "frontal" | "three-quarter" | "profile" | "back" | "low-angle" | "high-angle",
  "lighting": "daylight" | "indoor" | "night" | "sunset" | "studio",
  "environment": "neutral" | "indoor" | "outdoor" | "nature" | "city" | "sky",
  "mood": "neutral" | "smiling" | "serious" | "surprised" | "dreamy" | "stern" | "relaxed" | "contemplative",
  "action": "stand" | "sit" | "walk" | "gesture" | "hold-object" | "interact" | "none"
}

Rules:
- Use ONLY the listed values. Do NOT invent, pluralize, merge, or add adjectives.
- Always choose exactly one value for every field.
- If uncertain, pick the closest valid category by applying the definitions below.

ShotType guidelines (MOST important – follow these carefully):
1. extreme-close: Only part of the face or a very tight crop on facial detail (eyes, nose, mouth, single eye) – excludes most of head/shoulders.
2. close: Full head clearly visible (may include a bit of neck/shoulders) but NOT down to the waist.
3. medium: Subject framed roughly chest OR waist up (includes torso) but DOES NOT show knees/ankles/feet.
4. wide: Shows the full body OR at least head plus knees (or lower legs / ankles / feet). If knees or lower legs are visible, prefer "wide" over "medium".
   Priority when ambiguous: extreme-close > close > medium > wide.

Angle definitions:
- frontal: Face/front fully toward camera.
- three-quarter: Turned noticeably so one side is more visible but both eyes/cheeks present.
- profile: Exact or near side view (one eye, side of face).
- back: Back of head/body primarily visible.
- low-angle: Camera clearly below eye line looking upward.
- high-angle: Camera clearly above eye line looking downward.
(If low/high perspective is obvious AND frontal/three-quarter/profile also applies, choose low-angle/high-angle instead of the others.)

Lighting:
- daylight: Natural outdoor daylight (sun, overcast) not sunset / night.
- sunset: Warm golden/late sunlight or clear sunset hues.
- night: Dark scene, moonlight, stars, artificial night illumination.
- indoor: Non-studio artificial/interior ambient light.
- studio: Controlled, even or dramatic artificial lighting setup (seamless/background lights, softboxes, etc.).

Environment:
- neutral: Plain / solid / featureless backdrop.
- indoor: Interior space (room) with identifiable elements (furniture, walls) excluding neutral backdrops.
- outdoor: Outside but generic (cannot strongly classify as nature or city or sky focus).
- nature: Forest, desert, beach, lake, mountains, vegetation, natural landscape.
- city: Urban / architectural / street / skyline elements dominate.
- sky: Sky or aerial expanse dominates (horizon minimal subject context).

Mood (visible expression / vibe): neutral, smiling, serious, surprised, dreamy (soft distant gaze), stern (firm/intense), relaxed (calm pleasant), contemplative (thoughtful/inward).

Action (primary body activity): stand, sit, walk (in motion or mid-step), gesture (visible hand expressive motion), hold-object (actively holding a distinct object as focus), interact (engaging with another subject/animal/object), none (no notable action beyond posing).

Output ONLY the JSON object; do not wrap it in any text or code fences.`;
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
