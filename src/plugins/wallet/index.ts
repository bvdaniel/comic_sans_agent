import { Plugin } from "@ai16z/eliza";
import { walletAction } from "./action.js";

export const walletPlugin: Plugin = {
    name: "wallet",
    description: "Wallet operations and token management",
    actions: [walletAction],
    evaluators: [],
    providers: []
};

export default walletPlugin; 