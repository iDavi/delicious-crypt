import { toRecipe, fromRecipe, fromMessage, toMessage, MAX_BYTES } from "./recipe.js";
export function hide(message, lang = "en") {
    const bytes = fromMessage(message);
    if (bytes.length > MAX_BYTES)
        throw new Error(`message too long (max ${MAX_BYTES} bytes)`);
    return toRecipe(bytes, lang);
}
export function reveal(recipe) {
    return toMessage(fromRecipe(recipe));
}
export { MAX_BYTES };
