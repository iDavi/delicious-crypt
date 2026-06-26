// Renders a recipe from digits and parses digits back. Field order here is the
// single source of truth for both directions, so they can't drift apart.

import { bytesToInt, intToBytes, toDigits, fromDigits, capacity } from "./codec.js";

export type Lang = "en" | "pt";

const enc = new TextEncoder();
const dec = new TextDecoder();

// --- ingredient table -------------------------------------------------------
// Each line carries two digits: which name, and which amount. Both are things
// real recipes vary, so neither reads as data.
type Ing = { en: string[]; pt: string[]; unit: string; amounts: number[] };

const span = (start: number, count: number, step = 10) =>
  Array.from({ length: count }, (_, i) => start + i * step);

// "tsp" is the only unit that isn't written the same in both languages.
const unitText = (u: string, lang: Lang) => (u === "tsp" && lang === "pt" ? "c. chá" : u);

const INGREDIENTS: Ing[] = [
  { en: ["plain flour", "all-purpose flour", "sifted flour", "cake flour"], pt: ["farinha de trigo", "farinha de trigo peneirada", "farinha branca", "farinha para bolo"], unit: "g", amounts: span(150, 32, 5) },
  { en: ["sugar", "caster sugar", "white sugar", "granulated sugar"], pt: ["açúcar", "açúcar refinado", "açúcar branco", "açúcar cristal"], unit: "g", amounts: span(100, 32, 5) },
  { en: ["brown sugar", "light brown sugar"], pt: ["açúcar mascavo", "açúcar mascavo claro"], unit: "g", amounts: span(30, 32, 5) },
  { en: ["butter", "unsalted butter", "softened butter", "melted butter"], pt: ["manteiga", "manteiga sem sal", "manteiga amolecida", "manteiga derretida"], unit: "g", amounts: span(80, 32, 5) },
  { en: ["eggs"], pt: ["ovos"], unit: "", amounts: [1, 2, 3, 4, 5, 6] },
  { en: ["milk", "whole milk", "warm milk", "semi-skimmed milk"], pt: ["leite", "leite integral", "leite morno", "leite semidesnatado"], unit: "ml", amounts: span(80, 32, 5) },
  { en: ["plain yogurt", "Greek yogurt", "natural yogurt", "thick yogurt"], pt: ["iogurte natural", "iogurte grego", "iogurte integral", "iogurte cremoso"], unit: "g", amounts: span(80, 32, 5) },
  { en: ["vegetable oil", "sunflower oil", "canola oil", "light olive oil"], pt: ["óleo vegetal", "óleo de girassol", "óleo de canola", "azeite leve"], unit: "ml", amounts: span(30, 32, 5) },
  { en: ["honey", "runny honey"], pt: ["mel", "mel líquido"], unit: "g", amounts: span(30, 32, 5) },
  { en: ["rolled oats", "porridge oats"], pt: ["aveia em flocos", "aveia fina"], unit: "g", amounts: span(30, 32, 5) },
  { en: ["baking powder"], pt: ["fermento em pó"], unit: "tsp", amounts: [1, 2, 3] },
  { en: ["vanilla extract"], pt: ["essência de baunilha"], unit: "tsp", amounts: [1, 2] },
  { en: ["chopped walnuts", "dark chocolate chips", "raisins", "shredded coconut"], pt: ["nozes picadas", "gotas de chocolate", "uvas passas", "coco ralado"], unit: "g", amounts: [80, 100, 120] },
  { en: ["mashed banana", "grated carrot", "grated apple"], pt: ["banana amassada", "cenoura ralada", "maçã ralada"], unit: "g", amounts: span(100, 16) },
];

// --- header / method option tables -----------------------------------------
const T = {
  en: {
    adj: ["Classic", "Simple", "Soft", "Everyday"],
    tag: ["A soft, everyday bake.", "Keeps well for days.", "Great with coffee.", "A family favourite."],
    serves: [6, 8, 10, 12],
    prep: [10, 15, 20],
    bake: [40, 45, 50, 55, 60],
    temp: [170, 180, 190, 200],
    method: [
      ["Whisk the flour, baking powder and a pinch of salt in a bowl.", "Sift the flour with the baking powder and a little salt.", "Stir the flour, baking powder and salt together.", "Combine the flour, baking powder and salt in a large bowl."],
      ["Beat the butter and sugar until light and fluffy.", "Cream the butter with the sugar until pale.", "Whip the butter and sugar until smooth.", "Mix the butter and sugar until creamy."],
      ["Add the eggs one at a time, then the milk and vanilla.", "Beat in the eggs, then stir in the milk and vanilla.", "Mix in the eggs, milk and vanilla until combined.", "Add the eggs, then the milk and vanilla, beating well."],
      ["Fold the dry mix into the wet, then the rest of the ingredients.", "Gently stir the dry mix in and add the remaining ingredients.", "Fold everything together until just combined."],
      ["Pour into a lined tin and bake until a skewer comes out clean.", "Spoon into a lined tin and bake until golden and set.", "Tip into a lined tin and bake until risen and firm.", "Scrape into a lined tin and bake until cooked through."],
      ["Cool in the tin for 10 minutes, then turn out.", "Let it rest 10 minutes before turning out.", "Cool a little, then lift out onto a rack."],
      ["Dust with icing sugar before serving.", "Drizzle with a little honey to finish.", "Serve plain or with butter."],
    ],
    head: (adj: string, tag: string, s: number, p: number, b: number, t: number) =>
      [`# ${adj} Loaf Cake`, "", tag, "", `Serves ${s}. Prep ${p} min, bake ${b} min at ${t}°C.`, "", "## Ingredients"],
    methodTitle: "## Method",
  },
  pt: {
    adj: ["Clássico", "Simples", "Macio", "Caseiro"],
    tag: ["Um bolo macio do dia a dia.", "Dura bem por dias.", "Ótimo com café.", "Favorito da família."],
    serves: [6, 8, 10, 12],
    prep: [10, 15, 20],
    bake: [40, 45, 50, 55, 60],
    temp: [170, 180, 190, 200],
    method: [
      ["Misture a farinha, o fermento e uma pitada de sal numa tigela.", "Peneire a farinha com o fermento e um pouco de sal.", "Junte a farinha, o fermento e o sal.", "Combine a farinha, o fermento e o sal numa tigela grande."],
      ["Bata a manteiga e o açúcar até ficar fofo.", "Bata a manteiga com o açúcar até clarear.", "Bata a manteiga e o açúcar até ficar liso.", "Misture a manteiga e o açúcar até ficar cremoso."],
      ["Junte os ovos um a um, depois o leite e a baunilha.", "Acrescente os ovos, depois o leite e a baunilha.", "Misture os ovos, o leite e a baunilha.", "Adicione os ovos, depois o leite e a baunilha, batendo bem."],
      ["Incorpore os secos aos líquidos e depois o restante.", "Misture os secos delicadamente e junte o restante dos ingredientes.", "Una tudo até ficar homogêneo."],
      ["Despeje numa forma forrada e asse até o palito sair limpo.", "Coloque numa forma forrada e asse até dourar.", "Despeje numa forma forrada e asse até crescer e firmar.", "Transfira para uma forma forrada e asse até assar por completo."],
      ["Deixe esfriar na forma 10 minutos e desenforme.", "Descanse 10 minutos antes de desenformar.", "Esfrie um pouco e desenforme sobre uma grade."],
      ["Polvilhe açúcar de confeiteiro antes de servir.", "Regue com um fio de mel para finalizar.", "Sirva puro ou com manteiga."],
    ],
    head: (adj: string, tag: string, s: number, p: number, b: number, t: number) =>
      [`# Bolo de Forma ${adj}`, "", tag, "", `Rende ${s}. Preparo ${p} min, forno ${b} min a ${t}°C.`, "", "## Ingredientes"],
    methodTitle: "## Modo de preparo",
  },
};

// --- radices in fixed field order ------------------------------------------
// [adj, tag, serves, prep, bake, temp, ...ingredients, ...method]
function radices(): number[] {
  const head = [4, 4, 4, 3, 5, 4];
  const ing = INGREDIENTS.map((g) => g.en.length * g.amounts.length);
  const method = T.en.method.map((m) => m.length);
  return [...head, ...ing, ...method];
}

export const RADICES = radices();
export const MAX_BYTES = (() => {
  // largest k where any k-byte message always fits
  let cap = capacity(RADICES), k = -1;
  while (cap > 0n) { cap /= 256n; k++; }
  return k - 1;
})();

// --- render -----------------------------------------------------------------
export function toRecipe(bytes: Uint8Array, lang: Lang): string {
  const digits = toDigits(bytesToInt(bytes), RADICES);
  const t = T[lang];
  let k = 0;
  const adj = t.adj[digits[k++]];
  const tag = t.tag[digits[k++]];
  const serves = t.serves[digits[k++]];
  const prep = t.prep[digits[k++]];
  const bake = t.bake[digits[k++]];
  const temp = t.temp[digits[k++]];

  const ingLines = INGREDIENTS.map((g) => {
    const d = digits[k++];
    const amt = g.amounts[d % g.amounts.length];
    const name = g[lang][Math.floor(d / g.amounts.length)];
    const u = unitText(g.unit, lang);
    return `- ${amt} ${u ? u + " " : ""}${name}`;
  });

  const methodLines = t.method.map((variants, i) => `${i + 1}. ${variants[digits[k++]]}`);

  return [...t.head(adj, tag, serves, prep, bake, temp), ...ingLines, "", t.methodTitle, ...methodLines, ""].join("\n");
}

// --- parse ------------------------------------------------------------------
function parseDigits(text: string, lang: Lang): number[] {
  const t = T[lang];
  const lines = text.split("\n").map((l) => l.trim());
  const digits: number[] = [];
  const idx = (arr: readonly any[], v: any, what: string) => {
    const i = arr.findIndex((x) => String(x) === String(v));
    if (i < 0) throw new Error(`unreadable ${what}`);
    return i;
  };

  const title = lines.find((l) => l.startsWith("# ")) ?? "";
  const adj = t.adj.find((a) => title.includes(a));
  digits.push(idx(t.adj, adj, "title"));

  const tag = t.tag.find((x) => lines.includes(x));
  digits.push(idx(t.tag, tag, "subtitle"));

  const meta = lines.find((l) => /\d+ min.*\d+°C/.test(l)) ?? "";
  const nums = meta.match(/\d+/g)?.map(Number) ?? [];
  digits.push(idx(t.serves, nums[0], "servings"));
  digits.push(idx(t.prep, nums[1], "prep time"));
  digits.push(idx(t.bake, nums[2], "bake time"));
  digits.push(idx(t.temp, nums[3], "temperature"));

  const ingLines = lines.filter((l) => l.startsWith("- "));
  if (ingLines.length !== INGREDIENTS.length) throw new Error("wrong ingredient count");
  INGREDIENTS.forEach((g, i) => {
    const m = ingLines[i].slice(2).match(/^(\d+)\s+(.*)$/);
    if (!m) throw new Error("unreadable ingredient");
    let rest = m[2];
    const u = unitText(g.unit, lang);
    if (u) {
      if (!rest.startsWith(u + " ")) throw new Error("unreadable unit");
      rest = rest.slice(u.length + 1);
    }
    const amtIdx = idx(g.amounts, Number(m[1]), "amount");
    const nameIdx = idx(g[lang], rest, "ingredient");
    digits.push(nameIdx * g.amounts.length + amtIdx);
  });

  const methodLines = lines.filter((l) => /^\d+\.\s/.test(l)).map((l) => l.replace(/^\d+\.\s*/, ""));
  if (methodLines.length !== t.method.length) throw new Error("wrong step count");
  t.method.forEach((variants, i) => digits.push(idx(variants, methodLines[i], "method step")));

  return digits;
}

export function fromRecipe(text: string): Uint8Array {
  for (const lang of ["en", "pt"] as Lang[]) {
    try {
      const digits = parseDigits(text, lang);
      return intToBytes(fromDigits(digits, RADICES));
    } catch { /* try the other language */ }
  }
  throw new Error("this recipe does not decode to a message");
}

export function toMessage(bytes: Uint8Array): string { return dec.decode(bytes); }
export function fromMessage(s: string): Uint8Array { return enc.encode(s); }
