import { Action,generateText, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { detectComicSans } from "../../utils/detectComicSans.js";
import { v4 as uuidv4 } from 'uuid';


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
        return true;
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State, options?: any, callback?: any) => {
        try {
            const imageUrl = message.content.image;
            const character = runtime.character;
            const detectionResult = await detectComicSans(imageUrl);
            const tweetId = message.content.tweetId;
            const username = message.content.username;
            
            // Creamos el contexto real usando la personalidad del character
            const context = `
                You are ${character.name}. ${character.bio}
                Your personality traits are: ${character.adjectives.join(", ")}
                Your writing style is: ${character.style.chat.join(", ")}
                
                Current situation:
                Image analysis results:
                - Comic Sans detected: ${detectionResult.is_comic_sans}
                - Confidence: ${detectionResult.confidence.toFixed(2)}%
                
                Task:
                Generate a SHORT, SINGLE tweet-length response (max 280 characters):
                - If Comic Sans detected: Express excitement and ask for their wallet address
                - If not detected: Give a brief encouragement to keep trying
                
                Must be concise and conclusive, requiring no follow-up interaction.`;

            const response = await generateText({
                runtime,
                context,
                modelClass: "small"
            });
            const roomId = `comic-sans-${message.userId}-${tweetId}` as `${string}-${string}-${string}-${string}-${string}`;
            await runtime.ensureConnection(
                message.userId,
                roomId,
                message.content.username as string || "unknown",
                message.content.screenName as string || "unknown",
                "twitter"
            );
            const comicSansMemory: Memory = {
                id: uuidv4() as `${string}-${string}-${string}-${string}-${string}`,
                userId: message.userId,
                agentId: runtime.agentId,
                roomId: roomId, // Usar el roomId que creamos
                content: {
                    text: `COMIC_SANS_DETECTION:PENDING_WALLET`,
                    confidence: detectionResult.confidence,
                    imageUrl: imageUrl,
                    status: "pending_wallet",
                    originalUserId: message.userId
                },
                createdAt: Date.now()
            };

            // Guardamos la memoria en la base de datos
            await runtime.messageManager.createMemory(comicSansMemory);

            try {
                await callback({ text: response });
            } catch (error) {
                console.error("Error calling callback:", error);
            }
    
            return {
                success: detectionResult.is_comic_sans,
                response: response
            };
        } catch (error) {
            console.error("Error in comic sans detection:", error);
            return {
                success: false,
                response: "Sorry, I couldn't process the image. Please try again."
            };
        }
    }
}; 