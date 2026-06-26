#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { hide, reveal } from "./api.js";
import { Lang } from "./recipe.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const cmd = process.argv[2];

if (cmd === "encrypt") {
  const message = process.argv[3];
  const lang = (arg("-l") ?? arg("--lang") ?? "en") as Lang;
  process.stdout.write(hide(message, lang) + "\n");
} else if (cmd === "decrypt") {
  const file = process.argv[3] && !process.argv[3].startsWith("-") ? process.argv[3] : undefined;
  const recipe = file ? readFileSync(file, "utf8") : readFileSync(0, "utf8");
  process.stdout.write(reveal(recipe) + "\n");
} else {
  console.error("usage:");
  console.error('  recipe-crypt encrypt "<message>" [-l en|pt]');
  console.error("  recipe-crypt decrypt [file]        (reads stdin if no file)");
  process.exit(1);
}
