import { Action, generateText, IAgentRuntime, Memory, State } from "@ai16z/eliza";
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
                detectionResult = await detectComicSans(imageUrl);
            }

            // Preparar contexto para el mensaje
            const messageContext = {
                character: runtime.character,
                detectionResult,
                lastRewardTime: userStatus?.lastRewardAt,
                pendingWallet: userStatus?.status === 'pending_wallet'
            };

            // Generar respuesta apropiada
            const response = await generateMessage(messageContext, runtime);

            // Actualizar estado si es necesario
            if (detectionResult?.is_comic_sans && 
                !userStatus?.lastRewardAt && 
                !userStatus?.status) {
                await comicSans.addPendingUser(userId);
            }

            await callback({ text: response });

            return {
                success: true,
                response,
                detection: detectionResult,
                user_status: userStatus,
                action_taken: detectionResult?.is_comic_sans ? 'comic_sans_detected' : 'no_comic_sans'
            };

        } catch (error: any) {
            console.error("Error in comic sans action:", error);
            const errorResponse = "Sorry, I couldn't process your request. Please try again!";
            await callback({ text: errorResponse });
            return {
                success: false,
                response: errorResponse,
                error: error.message
            };
        }
    }
}; 