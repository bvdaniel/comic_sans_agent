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

async function llamaVisionCheck(imageUrl) {
    try {
        elizaLogger.log("🦙 Starting Llama Vision analysis for image:", imageUrl);
        
        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.2-11b-vision-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are a typography expert specialized in detecting Comic Sans MS font. Analyze images carefully for any text using Comic Sans."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this image and tell me if it contains Comic Sans MS font. Be specific about what text appears to be in Comic Sans."
                        },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ]
        });

        elizaLogger.log("🦙 Llama Vision analysis complete:", completion.choices[0].message);
        return completion.choices[0].message;
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

        const result = execSync(command, {
            encoding: "utf-8",
            stdio: ['pipe', 'pipe', 'pipe']
        });

        elizaLogger.log("🔄 Raw Python output:", result);

        try {
            const parsedResult = JSON.parse(result);
            
            // Log all status messages
            if (parsedResult.messages) {
                parsedResult.messages.forEach(msg => {
                    elizaLogger.log("🐍 Python Status:", msg);
                });
            }

            const pythonDetection = parsedResult.result || {
                is_comic_sans: false,
                confidence: 0
            };

            // Si la confianza es menor a 40%, retornamos resultado negativo
            if (!pythonDetection.confidence || pythonDetection.confidence < 40) {
                elizaLogger.log("📉 Confidence too low, skipping Llama Vision check");
                return {
                    is_comic_sans: false,
                    confidence: pythonDetection.confidence || 0,
                    analysis: "No Comic Sans detected with sufficient confidence.",
                    python_details: parsedResult,
                    llm_analysis: null
                };
            }

            // Si la confianza es mayor a 40%, confirmamos con Llama Vision
            elizaLogger.log("📈 Confidence sufficient, proceeding with Llama Vision check");
            const llamaResult = await llamaVisionCheck(imageUrl);

            if (!llamaResult) {
                // Si falla Llama Vision, usamos solo el resultado de Python
                return {
                    is_comic_sans: pythonDetection.is_comic_sans,
                    confidence: pythonDetection.confidence,
                    analysis: "Detection based only on image analysis.",
                    python_details: parsedResult,
                    llm_analysis: null
                };
            }

            // Análisis combinado
            const llmText = llamaResult.content;
            const isComicSans = pythonDetection.is_comic_sans && 
                              /comic\s*sans/i.test(llmText.toLowerCase());
            
            // Promediamos la confianza si ambos detectaron Comic Sans
            const finalConfidence = isComicSans ? 
                (pythonDetection.confidence + 90) / 2 : 
                pythonDetection.confidence;

            const result = {
                is_comic_sans: isComicSans,
                confidence: finalConfidence,
                analysis: llmText,
                python_details: parsedResult,
                llm_analysis: llamaResult
            };

            elizaLogger.log("✨ Final detection result:", result);
            return result;

        } catch (parseError) {
            elizaLogger.error("❌ Error parsing Python output:", parseError);
            elizaLogger.error("📜 Raw output that failed to parse:", result);
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