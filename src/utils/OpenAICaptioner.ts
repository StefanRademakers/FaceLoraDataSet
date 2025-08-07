import axios from "axios";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import os from "os";
import crypto from "crypto";

export class OpenAICaptioner {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private buildPrompt(token: string): string {
        return `You are an AI assistant preparing training captions for a LoRA dataset.
This is a photo of ${token}. Analyze it in detail and return a single, 
high-quality caption describing the visual features of the person, facial features, clothing, age and their setting - suitable for LoRA training. 
Use "${token}" as the subject placeholder.
Only return the caption. Do not include any explanation or punctuation outside the caption itself.`;
    }

    // Resize image to 512x512 and encode as base64 JPEG
    private async resizeAndEncodeImage(imagePath: string): Promise<string> {
        const buffer = await sharp(imagePath)
            .resize(512, 512, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toBuffer();
        return buffer.toString('base64');
    }

    // add a method to disable the caching system
    public async generateLoraCaption(imagePath: string, token: string, enableCaching: boolean = false): Promise<string> {
        // Resize and encode image for faster upload
        const base64Image = await this.resizeAndEncodeImage(imagePath);
        const prompt = this.buildPrompt(token);
        console.log('Generated prompt:', prompt);

        // Simple cache to avoid duplicate requests
        const cacheDir = path.join(os.homedir(), '.facelora_caption_cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        const hash = crypto.createHash('md5').update(imagePath + '|' + token).digest('hex');
        const cacheFile = path.join(cacheDir, `${hash}.txt`);
        if (enableCaching && fs.existsSync(cacheFile)) {
            return (await fs.promises.readFile(cacheFile, 'utf-8')).trim();
        }
        // Retry on rate limit (429) with exponential backoff
        const maxRetries = 3;
        let lastError: any;
        let response;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                response = await axios.post(
                    "https://api.openai.com/v1/chat/completions",
                    {
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
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${this.apiKey}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Log full OpenAI response for debugging
                console.log('OpenAI response data:', response.data);
                const caption = response.data.choices[0]?.message?.content?.trim();
                console.log('OpenAI response data content:', response.data.choices[0]?.message?.content);
                // Cache caption result
                try { await fs.promises.writeFile(cacheFile, caption, 'utf-8'); } catch { }
                return caption;
            } catch (error: any) {
                lastError = error;
                const status = error?.response?.status;
                // log remaining rate-limit if available
                const remaining = error?.response?.headers['x-ratelimit-remaining'];
                if (remaining != null) console.warn(`OpenAI rate limit remaining: ${remaining}`);
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