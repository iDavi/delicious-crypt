import { toRecipe, fromRecipe, fromMessage, toMessage, Lang, MAX_BYTES } from "./recipe.js";

export function hide(message: string, lang: Lang = "en"): string {
  const bytes = fromMessage(message);
  if (bytes.length > MAX_BYTES) throw new Error(`message too long (max ${MAX_BYTES} bytes)`);
  return toRecipe(bytes, lang);
}

export function reveal(recipe: string): string {
  return toMessage(fromRecipe(recipe));
}

export { Lang, MAX_BYTES };
