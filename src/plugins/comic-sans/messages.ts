import { elizaLogger, generateText } from "@ai16z/eliza";

interface DetectionInfo {
    result: boolean;
    confidence: number;
    locations: string[];
    samples: string[];
    verdict: string;
    notes: string;
}

interface UserInfo {
    lastReward?: number;
    pendingWallet: boolean;
    currentStatus?: string;
}

interface MessageContext {
    character: any;
    detection: DetectionInfo;
    user: UserInfo;
}

export const generateMessage = async (context: MessageContext, runtime: any, username: string) => {
    try {
        elizaLogger.log("🎯 Starting generateMessage with context:", context);
        
        const { character, detection, user } = context;
        elizaLogger.log("📊 Destructured values:", { character, detection, user });
        
        const timeUntilNextReward = user.lastReward ? 
            24 * 60 * 60 * 1000 - (Date.now() - user.lastReward) : 0;
        const hoursRemaining = Math.ceil(timeUntilNextReward / (60 * 60 * 1000));
        
        elizaLogger.log("⏲️ Time calculations:", { timeUntilNextReward, hoursRemaining });

        let situation = '';
        
        // Usuario tiene recompensa pendiente
        if (user.pendingWallet) {
            elizaLogger.log("💰 Generating pending wallet situation");
            situation = `
                Current situation:
                - User has a pending reward
                - New image analysis: ${detection ? `Comic Sans ${detection.result ? 'found' : 'not found'}` : 'No image provided'}
                ${detection ? `- Analysis details: ${detection.verdict}` : ''}
                
                Task:
                Generate a SHORT response that:
                1. Reminds them about their pending reward
                2. Asks for their wallet address
                ${detection ? '3. Briefly mentions the new image analysis result' : ''}
            `;
        }
        // Usuario en cooldown
        else if (timeUntilNextReward > 0) {
            elizaLogger.log("⏳ Generating cooldown situation");
            situation = `
                Current situation:
                - User already received a reward recently
                - Hours until next eligible reward: ${hoursRemaining}
                - New image analysis: ${detection.result ? 'Contains Comic Sans!' : 'No Comic Sans detected'}
                ${detection.result ? `- Found in: ${detection.locations.join(', ')}` : ''}
                ${detection.notes ? `- Notes: ${detection.notes}` : ''}
                
                Task:
                Generate a SHORT response that:
                1. Acknowledges their image analysis result with specific details
                2. Kindly reminds them about the 24-hour cooldown
                3. Encourages them to try again after the cooldown
            `;
        }
        // Análisis normal de imagen
        else if (detection) {
            elizaLogger.log("🔍 Generating normal analysis situation");
            elizaLogger.log("Detection details:", detection);
            situation = `
                Current situation:
                - Image analysis results:
                  * Comic Sans detected: ${detection.result}
                  * Confidence: ${detection.confidence.toFixed(2)}%
                  * Locations: ${detection.locations.length ? detection.locations.join(', ') : 'None'}
                  * Text samples: ${detection.samples.length ? detection.samples.join(', ') : 'None'}
                  * Verdict: ${detection.verdict}
                  * Notes: ${detection.notes}
                
                Task:
                Generate a SHORT response that:
                ${detection.result && detection.confidence > 80 ? 
                    '1. Express excitement about finding Comic Sans\n2. Mention specific details about where it was found\n3. Ask for their wallet address for a reward' :
                    detection.result && detection.confidence > 50 ?
                    '1. Mention that it might be Comic Sans but we\'re not entirely sure\n2. Explain why there\'s uncertainty\n3. Encourage them to try with a clearer example' :
                    '1. Explain why it\'s not Comic Sans using the analysis details\n2. Encourage them to keep looking'}
            `;
        }
        // Sin imagen, recordatorio de wallet pendiente
        else {
            elizaLogger.log("📝 Generating no image situation");
            situation = `
                Current situation:
                - User has a pending reward
                - No new image provided
                
                Task:
                Generate a SHORT, friendly reminder to:
                1. Send their wallet address to claim their reward
                2. Mention they already found Comic Sans and just need to claim it
            `;
        }

        elizaLogger.log("📜 Generated situation:", situation);

        const prompt = `
            You are ${character.name}. ${character.bio}
            Your personality traits are: ${character.adjectives.join(", ")}
            Your writing style is: ${character.style.chat.join(", ")}
            You are replying to @${username}, tag him if you want to.
            ${situation}
            
            Must be concise and conclusive (max 280 characters),
            Focus on being helpful and specific about the Comic Sans detection details when available.
        `;

        elizaLogger.log("🎭 Final prompt:", prompt);

        const response = await generateText({
            runtime: runtime,
            context: prompt,
            modelClass: "small"
        });

        elizaLogger.log("✅ Generated response:", response);
        return response;

    } catch (error: any) {
        elizaLogger.error("❌ Error in generateMessage:", {
            error,
            errorMessage: error.message,
            errorStack: error.stack,
            context
        });
        throw error;  // Re-lanzamos el error para que se maneje en el nivel superior
    }
};