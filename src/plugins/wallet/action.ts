import { Action, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { handleWalletReply } from "../../utils/walletHandler.js";
import { comicSans } from '../../storage/index.js';

export const walletAction: Action = {
    name: "WALLET_ACTION",
    description: "Handle wallet operations and token rewards",
    similes: ["wallet", "reward", "token", "address"],
    examples: [
        [{
            user: "user",
            content: { text: "0x1234..." }, // ejemplo de wallet address
        }],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Verificar si hay texto que parece una dirección de wallet
        return message.content.text?.includes('0x');
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State, options?: any, callback?: any) => {
        try {
            const userId = message.content.username as string;
            const userStatus = await comicSans.getUserStatus(userId);

            // Verificar si el usuario está pendiente de recibir recompensa
            if (!userStatus || userStatus.status !== 'pending_wallet') {
                const response = "Sorry, you need to share an image with Comic Sans first before sending a wallet address!";
                await callback({ text: response });
                return {
                    success: false,
                    response,
                    action_taken: 'no_pending_reward'
                };
            }

            // Procesar la wallet address
            const result = await handleWalletReply(message.content.text, runtime);

            if (result.isValid) {
                // Actualizar el estado del usuario en la DB
                await comicSans.completeUserReward(userId, result.txHash);
            }

            // Enviar respuesta al usuario
            await callback({ text: result.message });

            return {
                success: result.isValid,
                response: result.message,
                action_taken: result.isValid ? 'tokens_sent' : 'invalid_wallet',
                transaction: result.isValid ? {
                    hash: result.txHash,
                    address: message.content.text
                } : null
            };

        } catch (error: any) {
            console.error("Error in wallet action:", error);
            const errorMessage = "Sorry, something went wrong while processing your wallet address. Please try again later.";
            await callback({ text: errorMessage });
            return {
                success: false,
                response: errorMessage,
                error: error.message,
                action_taken: 'error'
            };
        }
    }
}; 