import { Action, elizaLogger, generateText, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { detectComicSans } from "../../utils/detectComicSans.js";
import { comicSans } from '../../storage/index.js';
import { generateMessage } from './messages.js';

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
            const userId = message.content.username as string;
            const userStatus = await comicSans.getUserStatus(userId);
            const imageUrl = message.content.image;
            
            let detectionResult = null;
            if (imageUrl) {
                elizaLogger.log("🎯 Starting Comic Sans detection for user:", userId);
                detectionResult = await detectComicSans(imageUrl);
                
                // Log del resultado detallado
                elizaLogger.log("📊 Detection Results:", {
                    is_comic_sans: detectionResult.is_comic_sans,
                    confidence: detectionResult.confidence,
                    locations: detectionResult.locations,
                    variations: detectionResult.variations,
                    final_verdict: detectionResult.final_verdict
                });
            }
    
            // Preparar contexto para el mensaje con más detalles
            const messageContext = {
                character: runtime.character,
                detection: {
                    result: detectionResult?.is_comic_sans || false,
                    confidence: detectionResult?.confidence || 0,
                    locations: detectionResult?.locations || [],
                    samples: detectionResult?.text_samples || [],
                    verdict: detectionResult?.final_verdict || "",
                    notes: detectionResult?.notes || ""
                },
                user: {
                    lastReward: userStatus?.lastRewardAt,
                    pendingWallet: userStatus?.status === 'pending_wallet',
                    currentStatus: userStatus?.status
                }
            };
            let response = null;
            try {
                // Generar respuesta apropiada con el contexto enriquecido
                response = await generateMessage(messageContext, runtime, userId);
            } catch (error) {
                elizaLogger.error("❌ Error generating message:", error);
                response = "Sorry, I couldn't process your request. Please try again!";
            }
    
            // Actualizar estado solo si estamos muy seguros (confianza > 80%)
            if (detectionResult?.is_comic_sans && 
                detectionResult.confidence > 80 && 
                !userStatus?.lastRewardAt && 
                !userStatus?.status) {
                elizaLogger.log("🎁 Adding pending reward for user:", userId);
                await comicSans.addPendingUser(userId);
            }
    
            await callback({ text: response });
    
            // Retornar resultado enriquecido
            return {
                success: true,
                response,
                detection: {
                    is_comic_sans: detectionResult?.is_comic_sans || false,
                    confidence: detectionResult?.confidence || 0,
                    locations: detectionResult?.locations || [],
                    variations: detectionResult?.variations || [],
                    text_samples: detectionResult?.text_samples || [],
                    final_verdict: detectionResult?.final_verdict || "",
                    notes: detectionResult?.notes || "",
                    python_analysis: detectionResult?.python_details || null
                },
                user_status: userStatus,
                action_taken: detectionResult?.is_comic_sans ? 
                             `comic_sans_detected_${detectionResult.confidence}` : 
                             'no_comic_sans'
            };
    
        } catch (error: any) {
            elizaLogger.error("❌ Error in comic sans action:", error);
            const errorResponse = "Sorry, I couldn't process your request. Please try again!";
            await callback({ text: errorResponse });
            return {
                success: false,
                response: errorResponse,
                error: {
                    message: error.message,
                    details: error.stack
                }
            };
        }
    }
}; 