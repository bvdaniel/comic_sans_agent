import { execSync } from 'child_process';
import { elizaLogger, settings } from '@ai16z/eliza';
import { join } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fontPath = join(__dirname, '..', '..', 'assets', 'fonts', 'comic.ttf');
const pythonPath = join(process.cwd(), 'venv', 'bin', 'python3');

// Inicializar OpenAI con OpenRouter
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "https://github.com/your-repo", // Ajusta esto
        "X-Title": "Comic Sans Detective",
    }
});

async function llamaVisionCheck(imageUrl, pythonAnalysis) {
    try {
        elizaLogger.log("🦙 Starting Llama Vision analysis for image:", imageUrl);
        
        const completion = await openai.chat.completions.create({
            model: "amazon/nova-lite-v1",
            messages: [
                {
                    role: "system",
                    content: `You are a typography expert specialized in detecting Comic Sans MS font in any context.
                                You can identify Comic Sans in:
                                - Digital text
                                - Printed materials
                                - T-shirts and clothing
                                - Graffiti or street art
                                - Signs and banners
                                - Bold, italic, or any other style variation
                                - Different sizes and colors
                                - Partial or modified versions

                                You will analyze both the image and the results from an automated font detection system.
                                Provide your final analysis considering both sources of information.

                                Respond ONLY with a JSON object using this exact structure:
                                {
                                    "is_comic_sans": boolean,
                                    "confidence": number (0-100),
                                    "locations": array of strings (where Comic Sans appears),
                                    "variations": array of strings (bold, italic, etc.),
                                    "text_samples": array of strings (examples of text in Comic Sans),
                                    "notes": string (including analysis of why you agree/disagree with the automated detection),
                                    "final_verdict": string (brief explanation of your conclusion)
                                }`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this image for Comic Sans MS font presence.
                            
The automated detection system returned these results:
${JSON.stringify(pythonAnalysis, null, 2)}

Consider both your visual analysis and these automated results to make your final determination.`
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        elizaLogger.log("🦙 Llama Vision analysis complete:", completion.choices[0].message);
        // Extraer el JSON del contenido, sea markdown o no
        const content = completion.choices[0].message.content;
        let jsonString = content;

        // Si parece ser markdown (contiene ```), extraer el contenido
        if (content.includes('```')) {
            // Manejar tanto ```json como ``` a secas
            const match = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (match) {
                jsonString = match[1].trim();
            }
        }
        
        elizaLogger.log("🦙 Cleaned content for parsing:", jsonString);
        
        // Parseamos el content limpio
        const result = JSON.parse(jsonString);
        return result;
    } catch (error) {
        elizaLogger.error("❌ Error in Llama Vision analysis:", error);
        return null;
    }
}

export const detectComicSans = async (imageUrl) => {
    try {
        elizaLogger.log("🔍 Starting Comic Sans detection for image:", imageUrl);
        elizaLogger.log("📂 Using Comic Sans font from:", fontPath);

        // Primer paso: Detección con Python
        const command = `${pythonPath} ${process.cwd()}/src/scripts/comic_sans_detector.py "${imageUrl}" "${fontPath}"`;
        elizaLogger.log("🚀 Executing Python command:", command);

        const pythonOutput = execSync(command, {
            encoding: "utf-8",
            stdio: ['pipe', 'pipe', 'pipe']
        });

        elizaLogger.log("🔄 Raw Python output:", pythonOutput);
        
        try {
            const parsedResult = JSON.parse(pythonOutput);
            
            // Log all status messages
            if (parsedResult.messages) {
                parsedResult.messages.forEach(msg => {
                    elizaLogger.log("🐍 Python Status:", msg);
                });
            }

            // Llamar a Llama Vision con los resultados del análisis Python
            const llamaResult = await llamaVisionCheck(imageUrl, parsedResult);

            if (!llamaResult) {
                // Si falla Llama Vision, usamos solo el resultado de Python
                return {
                    is_comic_sans: parsedResult.result?.is_comic_sans || false,
                    confidence: parsedResult.result?.confidence || 0,
                    locations: [],
                    variations: [],
                    text_samples: [],
                    notes: "Detection based only on automated analysis.",
                    final_verdict: "Analysis based on automated detection only.",
                    python_details: parsedResult
                };
            }

            // Retornamos el análisis completo del LLM que ya incluye la consideración del análisis Python
            return {
                ...llamaResult,  // Esto ya tiene la estructura correcta del JSON que devuelve llamaVisionCheck
                python_details: parsedResult
            };

        } catch (parseError) {
            elizaLogger.error("❌ Error parsing Python output:", parseError);
            elizaLogger.error("📜 Raw output that failed to parse:", pythonOutput);
            throw parseError;
        }
    } catch (error) {
        elizaLogger.error("❌ Error in Comic Sans detection:", error);
        elizaLogger.error("📜 Error details:", {
            message: error.message,
            stderr: error.stderr,
            stdout: error.stdout,
            status: error.status,
            signal: error.signal
        });
        throw error;
    }
};