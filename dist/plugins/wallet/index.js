import { walletAction } from "./action.js";
export const walletPlugin = {
    name: "wallet",
    description: "Wallet operations and token management",
    actions: [walletAction],
    evaluators: [],
    providers: []
};
export default walletPlugin;
