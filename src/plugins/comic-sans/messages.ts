interface MessageContext {
    character: any;
    detectionResult?: any;
    lastRewardTime?: number;
    pendingWallet?: boolean;
}

export const generateMessage = async (context: MessageContext, runtime: any) => {
    const { character, detectionResult, lastRewardTime, pendingWallet } = context;
    const timeUntilNextReward = lastRewardTime ? 
        24 * 60 * 60 * 1000 - (Date.now() - lastRewardTime) : 0;
    const hoursRemaining = Math.ceil(timeUntilNextReward / (60 * 60 * 1000));

    let situation = '';
    
    // Usuario tiene recompensa pendiente
    if (pendingWallet) {
        situation = `
            Current situation:
            - User has a pending reward
            - New image analysis: ${detectionResult ? `Comic Sans detected: ${detectionResult.is_comic_sans}` : 'No image provided'}
            
            Task:
            Generate a SHORT response that:
            1. Reminds them about their pending reward
            2. Asks for their wallet address
            ${detectionResult ? '3. Also mentions the result of their new image analysis' : ''}
        `;
    }
    // Usuario en cooldown
    else if (timeUntilNextReward > 0) {
        situation = `
            Current situation:
            - User already received a reward recently
            - Hours until next eligible reward: ${hoursRemaining}
            - New image analysis: ${detectionResult?.is_comic_sans ? 'Contains Comic Sans!' : 'No Comic Sans detected'}
            
            Task:
            Generate a SHORT response that:
            1. Acknowledges their image analysis result
            2. Kindly reminds them about the 24-hour cooldown
            3. Encourages them to try again after the cooldown
        `;
    }
    // Análisis normal de imagen
    else if (detectionResult) {
        situation = `
            Current situation:
            - Image analysis results:
              * Comic Sans detected: ${detectionResult.is_comic_sans}
              * Confidence: ${detectionResult.confidence.toFixed(2)}%
              * Analysis: ${detectionResult.analysis || ''}
            
            Task:
            Generate a SHORT response that:
            ${detectionResult.is_comic_sans ? 
                '1. Express excitement about finding Comic Sans\n2. Ask for their wallet address for a reward' :
                '1. Explain why it\'s not Comic Sans\n2. Encourage them to keep looking'}
        `;
    }
    // Sin imagen, recordatorio de wallet pendiente
    else {
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

    const prompt = `
        You are ${character.name}. ${character.bio}
        Your personality traits are: ${character.adjectives.join(", ")}
        Your writing style is: ${character.style.chat.join(", ")}
        
        ${situation}
        
        Must be concise and conclusive (max 280 characters).
    `;

    return await runtime.generateText({
        context: prompt,
        modelClass: "small"
    });
};