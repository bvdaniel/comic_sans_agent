import {
    IAgentRuntime,
    Memory,
    State,
    ActionExample,
  } from "@ai16z/eliza";
  import { detectComicSans } from "../../utils/detectComicSans"; // Adjust the import path as necessary
  //import { handleApiError } from "../../common/utils.ts"; // Adjust the import path as necessary
  import { handleWalletReply } from '../../utils/walletHandler.js';
  

  export const handleApiError = (error: unknown) => {
    console.error("API Error:", error); // Log the error for debugging
    return {
      success: false,
      response: "An error occurred while processing your request. Please try again later.",
    };
  };
  
  async function getWalletBalance(runtime: IAgentRuntime): Promise<string> {
    // For now, return a placeholder or implement actual balance check
    return "100 COMIC";
  }
  
  export class ComicAgentPlugin {
    readonly name: string = "comic-agent";
    readonly description: string = "Detect Comic Sans and manage wallet actions";
    
    actions = [
      {
        name: "DETECT_COMIC_SANS",
        description: "Detect Comic Sans in an image",
        examples: [
          [
            {
              user: "user",
              content: { text: "Can you check this image for Comic Sans?" },
            },
          ],
        ],
        validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
          // Add validation logic if necessary
          return true;
        },
        handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
          try {
            const imageUrl = message.content.text; // Assuming the image URL is passed in the text
            const detectionResult = await detectComicSans(imageUrl);
            return {
              success: true,
              response: detectionResult,
            };
          } catch (error) {
            return handleApiError(error);
          }
        },
      },
      {
        name: "WALLET_ACTION",
        description: "Perform actions related to the wallet",
        examples: [
          [
            {
              user: "user",
              content: { text: "Check my wallet balance" },
            },
          ],
        ],
        validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
          // Add validation logic if necessary
          return true;
        },
        handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
          try {
            const walletBalance = await getWalletBalance(runtime);
            return {
              success: true,
              response: `Your wallet balance is ${walletBalance}.`,
            };
          } catch (error) {
            return handleApiError(error);
          }
        },
      },
    ];
  }
  
  export default new ComicAgentPlugin();