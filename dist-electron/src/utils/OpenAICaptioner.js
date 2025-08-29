"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICaptioner = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
class OpenAICaptioner {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    buildPrompt(token, subjectAddition = '', template) {
        const defaultTemplate = `You are an AI assistant preparing training captions for a LoRA dataset.
The images are AI-generated and depict a fictional character, not a real person.
Start the caption with EXACTLY: {{token}}{{addition}}, 
After that, describe only variable aspects such as clothing, accessories, pose, body framing, environment, time of day, lighting, mood, camera details (focal length/angle), composition, and context-specific actions.
Do NOT mention or paraphrase anything about age, hair color, beard, face shape, head features, gender, or synonyms thereof after {{token}}{{addition}}.
Do NOT repeat {{token}} or any part of {{addition}} anywhere else in the caption.
Write one concise sentence in English, using clear, concrete visual descriptors suitable for LoRA training.
Only return the caption text (no quotes, no leading labels, no extra lines).`;
        const addition = subjectAddition.trim() ? ' ' + subjectAddition.trim() : '';
        const active = (template && template.trim().length > 0 ? template : defaultTemplate)
            .replace(/{{token}}/g, token)
            .replace(/{{addition}}/g, addition);
        return active;
    }
    // Resize image to 512x512 and encode as base64 JPEG
    async resizeAndEncodeImage(imagePath) {
        const buffer = await (0, sharp_1.default)(imagePath)
            .resize(512, 512, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toBuffer();
        return buffer.toString('base64');
    }
    // add a method to disable the caching system
    async generateLoraCaption(imagePath, token, subjectAddition = '', enableCaching = false, promptTemplate) {
        // Resize and encode image for faster upload
        const base64Image = await this.resizeAndEncodeImage(imagePath);
        const prompt = this.buildPrompt(token, subjectAddition, promptTemplate);
        console.log('Generated prompt:', prompt);
        // Simple cache to avoid duplicate requests
        const cacheDir = path_1.default.join(os_1.default.homedir(), '.facelora_caption_cache');
        if (!fs_1.default.existsSync(cacheDir))
            fs_1.default.mkdirSync(cacheDir, { recursive: true });
        const hash = crypto_1.default.createHash('md5').update(imagePath + '|' + token + '|' + subjectAddition + '|' + (promptTemplate || '')).digest('hex');
        const cacheFile = path_1.default.join(cacheDir, `${hash}.txt`);
        if (enableCaching && fs_1.default.existsSync(cacheFile)) {
            return (await fs_1.default.promises.readFile(cacheFile, 'utf-8')).trim();
        }
        // Retry on rate limit (429) with exponential backoff
        const maxRetries = 3;
        let lastError;
        let response;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                response = await axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: prompt,
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/jpeg;base64,${base64Image}`,
                                    },
                                },
                            ],
                        },
                    ],
                    temperature: 0.7,
                }, {
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                });
                // Log full OpenAI response for debugging
                console.log('OpenAI response data:', response.data);
                const caption = response.data.choices[0]?.message?.content?.trim();
                console.log('OpenAI response data content:', response.data.choices[0]?.message?.content);
                // Cache caption result
                try {
                    await fs_1.default.promises.writeFile(cacheFile, caption, 'utf-8');
                }
                catch { }
                return caption;
            }
            catch (error) {
                lastError = error;
                const status = error?.response?.status;
                // log remaining rate-limit if available
                const remaining = error?.response?.headers['x-ratelimit-remaining'];
                if (remaining != null)
                    console.warn(`OpenAI rate limit remaining: ${remaining}`);
                if (status === 429 && attempt < maxRetries) {
                    // wait before retry
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(res => setTimeout(res, delay));
                    continue;
                }
                // Non-retryable or out of attempts
                const msg = status === 429
                    ? 'OpenAI rate limit exceeded. Please try again later.'
                    : error.message || String(error);
                throw new Error(`Failed to generate caption: ${msg}`);
            }
        }
        // If all retries failed
        throw new Error(`Failed to generate caption after ${maxRetries} attempts: ${lastError}`);
    }
}
exports.OpenAICaptioner = OpenAICaptioner;
