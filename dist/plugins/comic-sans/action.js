import { detectComicSans } from "../../utils/detectComicSans.js";
import { handleWalletReply } from "../../utils/walletHandler.js";
export const comicSansAction = {
    name: "DETECT_COMIC_SANS",
    description: "Detect Comic Sans in an image and reward tokens",
    similes: ["detect", "check", "analyze"],
    examples: [
        [{
                user: "user",
                content: { text: "Can you check this image for Comic Sans?" },
            }],
    ],
    validate: async (runtime, message, state) => {
        return true;
    },
    handler: async (runtime, message, state) => {
        try {
            const imageUrl = message.content.text;
            const detectionResult = await detectComicSans(imageUrl);
            return handleWalletReply(detectionResult);
        }
        catch (error) {
            console.error("Error in comic sans detection:", error);
            return {
                success: false,
                response: "Sorry, I couldn't process the image. Please try again."
            };
        }
    }
};
