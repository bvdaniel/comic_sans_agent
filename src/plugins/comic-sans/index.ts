import { Plugin } from "@ai16z/eliza";
import { comicSansAction } from "./action.js";

export const comicSansPlugin: Plugin = {
    name: "comic-sans",
    description: "Comic Sans detection and token rewards",
    actions: [comicSansAction],
    evaluators: [],
    providers: []
};

export default comicSansPlugin; 