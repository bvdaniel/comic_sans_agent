import { Plugin } from "@ai16z/eliza";
import { walletAction } from "./action.js";

export const walletPlugin: Plugin = {
    name: "wallet",
    description: "Handle wallet transfers and token rewards",
    actions: [walletAction],
    evaluators: [],
    providers: []
};

export default walletPlugin; 