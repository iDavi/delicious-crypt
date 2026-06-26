import { toRecipe, fromRecipe, fromMessage, toMessage, Lang, MAX_BYTES } from "./recipe.js";

// Long messages don't fit one recipe, so we split the bytes into chunks and
// emit one recipe per chunk — a recipe collection. Decoding joins the chunks
// back at the byte level, so multibyte characters split across recipes survive.

const SEPARATOR = "\n\n";

export function hide(message: string, lang: Lang = "en"): string {
  const bytes = fromMessage(message);
  const recipes: string[] = [];
  for (let i = 0; i < Math.max(bytes.length, 1); i += MAX_BYTES) {
    recipes.push(toRecipe(bytes.slice(i, i + MAX_BYTES), lang));
  }
  return recipes.join(SEPARATOR);
}

export function reveal(text: string): string {
  // regroup the text into recipe blocks (each starts with a "# " title)
  const blocks: string[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("# ")) blocks.push(line);
    else if (blocks.length) blocks[blocks.length - 1] += "\n" + line;
  }
  if (!blocks.length) throw new Error("no recipe found in this text");

  const parts = blocks.map(fromRecipe);
  const total = parts.reduce((n, p) => n + p.length, 0);
  const all = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { all.set(p, off); off += p.length; }
  return toMessage(all);
}

export { Lang, MAX_BYTES };
