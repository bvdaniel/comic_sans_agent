import { Action, generateText, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { detectComicSans } from "../../utils/detectComicSans.js";
import { comicSans } from '../../storage/index.js';

export const comicSansAction: Action = {
    name: "DETECT_COMIC_SANS",
    description: "Detect Comic Sans in an image and reward tokens",
    similes: ["detect", "check", "analyze"],
    examples: [
        [{
            user: "user",
            content: { text: "Can you check this image for Comic Sans?" },
        }],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State, options?: any, callback?: any) => {
        return Boolean(message.content.image);
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State, options?: any, callback?: any) => {
        try {
            const imageUrl = message.content.image;
            const character = runtime.character;
            const userId = message.userId;

            // Realizar la detección combinada (Python + LLM)
            const detectionResult = await detectComicSans(imageUrl);
            
            // Si es Comic Sans con alta confianza, agregamos al usuario como pendiente
            if (detectionResult.is_comic_sans && detectionResult.confidence >= 60) {
                try {
                    comicSans.addPendingUser(userId);
                    console.log("Usuario agregado como pendiente:", userId);
                } catch (error) {
                    console.error("Error al agregar usuario pendiente:", error);
                }
            }
            
            // Preparar los detalles del análisis para el contexto
            const pythonDetails = detectionResult.python_details?.result || {};
            const detectedText = pythonDetails.detected_text || [];
            const llmAnalysis = detectionResult.llm_analysis?.content || "No LLM analysis available.";
            
            const context = `
                You are ${character.name}. ${character.bio}
                Your personality traits are: ${character.adjectives.join(", ")}
                Your writing style is: ${character.style.chat.join(", ")}
                
                Current situation:
                Technical analysis results:
                - Initial detection confidence: ${pythonDetails.confidence?.toFixed(2) || 0}%
                - Detected text: ${detectedText.join(", ")}
                
                AI Vision analysis:
                ${llmAnalysis}
                
                Final results:
                - Comic Sans detected: ${detectionResult.is_comic_sans}
                - Combined confidence: ${detectionResult.confidence.toFixed(2)}%
                
                Task:
                Generate a SHORT, SINGLE tweet-length response (max 280 characters):
                ${detectionResult.is_comic_sans ? `
                - Express excitement about finding Comic Sans
                - Mention the specific text found (${detectedText.join(", ")})
                - Ask for their wallet address for a reward
                ` : `
                - Explain why the text doesn't appear to be Comic Sans
                - Reference what was actually found
                - Give a friendly encouragement to keep looking
                `}
                
                Must be concise and conclusive, requiring no follow-up interaction.
                If asking for wallet, be clear it's for a reward.`;

            const response = await generateText({
                runtime,
                context,
                modelClass: "small"
            });

            try {
                await callback({ text: response });
            } catch (error) {
                console.error("Error calling callback:", error);
            }
    
            return {
                success: detectionResult.is_comic_sans,
                response: response,
                detection: {
                    is_comic_sans: detectionResult.is_comic_sans,
                    confidence: detectionResult.confidence,
                    python_analysis: pythonDetails,
                    llm_analysis: detectionResult.llm_analysis
                }
            };
        } catch (error: any) {
            console.error("Error in comic sans detection:", error);
            return {
                success: false,
                response: "Sorry, I couldn't process the image properly. Please try again with a different image.",
                error: error.message
            };
        }
    }
}; 