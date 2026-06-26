// Renders a recipe from digits and parses digits back. Field order here is the
// single source of truth for both directions, so they can't drift apart.
// An elaborate multi-section layer cake carries enough natural choices to hold
// ~32 bytes in one recipe.

import { bytesToInt, intToBytes, toDigits, fromDigits, capacity } from "./codec.js";

export type Lang = "en" | "pt";

const enc = new TextEncoder();
const dec = new TextDecoder();

const span = (start: number, count: number, step = 1) =>
  Array.from({ length: count }, (_, i) => start + i * step);

// "tsp" is the only unit written differently across languages.
const unitText = (u: string, lang: Lang) => (u === "tsp" && lang === "pt" ? "c. chá" : u);

// --- ingredient table -------------------------------------------------------
// Each line carries two digits: which name and which amount. Precise metric
// amounts are normal in serious baking, so the numbers don't read as data.
type Ing = { en: string[]; pt: string[]; unit: string; amounts: number[] };

const INGREDIENTS: Ing[] = [
  // For the cake
  { en: ["plain flour", "all-purpose flour", "sifted flour", "cake flour"], pt: ["farinha de trigo", "farinha de trigo peneirada", "farinha branca", "farinha para bolo"], unit: "g", amounts: span(150, 200) },
  { en: ["caster sugar", "sugar", "white sugar", "golden caster sugar"], pt: ["açúcar refinado", "açúcar", "açúcar branco", "açúcar cristal"], unit: "g", amounts: span(150, 180) },
  { en: ["butter", "unsalted butter", "softened butter", "melted butter"], pt: ["manteiga", "manteiga sem sal", "manteiga amolecida", "manteiga derretida"], unit: "g", amounts: span(120, 160) },
  { en: ["eggs"], pt: ["ovos"], unit: "", amounts: [2, 3, 4, 5, 6] },
  { en: ["whole milk", "milk", "warm milk", "buttermilk"], pt: ["leite integral", "leite", "leite morno", "leitelho"], unit: "ml", amounts: span(100, 180) },
  { en: ["sunflower oil", "vegetable oil", "canola oil", "light olive oil"], pt: ["óleo de girassol", "óleo vegetal", "óleo de canola", "azeite leve"], unit: "ml", amounts: span(40, 140) },
  { en: ["plain yogurt", "Greek yogurt", "natural yogurt", "sour cream"], pt: ["iogurte natural", "iogurte grego", "iogurte integral", "creme azedo"], unit: "g", amounts: span(80, 160) },
  { en: ["ground almonds", "almond flour"], pt: ["farinha de amêndoa", "amêndoa moída"], unit: "g", amounts: span(50, 120) },
  { en: ["light brown sugar", "soft brown sugar"], pt: ["açúcar mascavo claro", "açúcar mascavo"], unit: "g", amounts: span(40, 128) },
  { en: ["baking powder"], pt: ["fermento em pó"], unit: "tsp", amounts: [1, 2, 3] },
  { en: ["vanilla extract"], pt: ["essência de baunilha"], unit: "tsp", amounts: [1, 2] },
  // For the filling
  { en: ["double cream", "heavy cream"], pt: ["creme de leite fresco", "creme de leite"], unit: "ml", amounts: span(150, 150) },
  { en: ["icing sugar", "powdered sugar"], pt: ["açúcar de confeiteiro", "açúcar impalpável"], unit: "g", amounts: span(60, 120) },
  { en: ["mascarpone", "cream cheese"], pt: ["mascarpone", "cream cheese"], unit: "g", amounts: span(120, 150) },
  { en: ["strawberry jam", "raspberry jam", "apricot jam", "blackcurrant jam"], pt: ["geleia de morango", "geleia de framboesa", "geleia de damasco", "geleia de cassis"], unit: "g", amounts: span(80, 120) },
  { en: ["sliced strawberries", "raspberries", "blueberries"], pt: ["morangos fatiados", "framboesas", "mirtilos"], unit: "g", amounts: span(80, 120) },
  { en: ["lemon curd"], pt: ["creme de limão"], unit: "g", amounts: span(60, 120) },
  { en: ["white chocolate", "chopped white chocolate"], pt: ["chocolate branco", "chocolate branco picado"], unit: "g", amounts: span(40, 128) },
  // For the frosting
  { en: ["unsalted butter", "softened butter", "butter"], pt: ["manteiga sem sal", "manteiga amolecida", "manteiga"], unit: "g", amounts: span(150, 150) },
  { en: ["icing sugar", "powdered sugar"], pt: ["açúcar de confeiteiro", "açúcar impalpável"], unit: "g", amounts: span(200, 180) },
  { en: ["cocoa powder", "unsweetened cocoa"], pt: ["cacau em pó", "cacau sem açúcar"], unit: "g", amounts: span(20, 60) },
  { en: ["dark chocolate", "milk chocolate", "chocolate chips"], pt: ["chocolate meio amargo", "chocolate ao leite", "gotas de chocolate"], unit: "g", amounts: span(80, 150) },
  { en: ["milk", "whole milk"], pt: ["leite", "leite integral"], unit: "ml", amounts: span(20, 50) },
  { en: ["vanilla extract"], pt: ["essência de baunilha"], unit: "tsp", amounts: [1, 2] },
  // To finish
  { en: ["chopped walnuts", "chopped pecans", "chopped hazelnuts", "chopped pistachios"], pt: ["nozes picadas", "nozes-pecã picadas", "avelãs picadas", "pistaches picados"], unit: "g", amounts: span(40, 110) },
  { en: ["grated chocolate", "chocolate shavings", "chocolate curls"], pt: ["chocolate ralado", "raspas de chocolate", "cachos de chocolate"], unit: "g", amounts: span(30, 90) },
  { en: ["desiccated coconut", "shredded coconut"], pt: ["coco ralado", "coco em flocos"], unit: "g", amounts: span(20, 80) },
  { en: ["honey", "runny honey"], pt: ["mel", "mel líquido"], unit: "g", amounts: span(20, 100) },
  { en: ["sprinkles", "sugar pearls", "chocolate sprinkles"], pt: ["granulado", "confeitos", "granulado de chocolate"], unit: "g", amounts: span(20, 80) },
  { en: ["fresh raspberries", "fresh blueberries"], pt: ["framboesas frescas", "mirtilos frescos"], unit: "g", amounts: span(60, 120) },
  { en: ["toasted flaked almonds", "flaked almonds"], pt: ["amêndoas laminadas tostadas", "amêndoas laminadas"], unit: "g", amounts: span(30, 90) },
  { en: ["caramel sauce", "dulce de leche"], pt: ["calda de caramelo", "doce de leite"], unit: "g", amounts: span(40, 128) },
];

const SECTIONS: { en: string; pt: string; count: number }[] = [
  { en: "For the cake", pt: "Para o bolo", count: 11 },
  { en: "For the filling", pt: "Para o recheio", count: 7 },
  { en: "For the frosting", pt: "Para a cobertura", count: 6 },
  { en: "To finish", pt: "Para finalizar", count: 8 },
];

// --- header / method tables -------------------------------------------------
const T = {
  en: {
    adj: ["Classic", "Simple", "Celebration", "Special"],
    tag: ["A proper celebration cake.", "Worth the effort.", "A real centrepiece.", "Soft sponge, rich filling."],
    size: ["Makes one two-layer cake.", "Makes one three-layer cake.", "Makes a tall layer cake.", "Makes a large celebration cake."],
    serves: [8, 10, 12, 16],
    prep: [20, 30, 40, 45],
    chill: [15, 30, 45, 60],
    bake: [25, 30, 35, 40, 45],
    temp: [160, 170, 180, 190],
    title: (adj: string) => `# ${adj} Layer Cake`,
    meta: (s: number, p: number, c: number, b: number, t: number) => `Serves ${s}. Prep ${p} min, chill ${c} min, bake ${b} min at ${t}°C.`,
    ingHead: "## Ingredients",
    methodHead: "## Method",
    method: [
      ["Heat the oven and grease and line the tins.", "Preheat the oven and line the cake tins.", "Butter and line the cake tins and heat the oven."],
      ["Beat the butter and sugar until pale and fluffy.", "Cream the butter with the sugar until light.", "Whisk the butter and sugar until soft and pale."],
      ["Add the eggs one at a time, beating well.", "Beat in the eggs one by one.", "Add the eggs gradually, mixing after each."],
      ["Fold in the flour, ground almonds and baking powder.", "Sift in the flour and baking powder and fold gently.", "Gently fold the dry ingredients into the batter."],
      ["Stir in the milk, oil and yogurt until smooth.", "Mix in the yogurt, milk and oil.", "Loosen the batter with the milk, oil and yogurt."],
      ["Divide between the tins and bake until risen and springy.", "Spread into the tins and bake until a skewer comes out clean.", "Share between the tins and bake until golden."],
      ["Cool in the tins for 10 minutes, then turn out.", "Leave to cool, then turn out onto a rack.", "Rest 10 minutes, then cool completely on a rack."],
      ["For the filling, whip the cream with the icing sugar.", "Whip the cream and icing sugar to soft peaks.", "Beat the cream with the sugar until thick."],
      ["Fold in the mascarpone, then the jam and berries.", "Stir through the mascarpone and ripple in the jam.", "Mix in the mascarpone and fold in the fruit."],
      ["Sandwich the layers with the filling.", "Spread the filling between the layers and stack.", "Stack the sponges with the filling in between."],
      ["For the frosting, beat the butter, icing sugar and cocoa.", "Cream the butter with the icing sugar and cocoa.", "Whisk the butter, sugar and cocoa until smooth."],
      ["Cover the cake with the frosting, adding the chocolate and milk.", "Spread the frosting over the top and sides.", "Coat the cake all over with the frosting."],
      ["Decorate with the nuts, chocolate and a dusting of sugar.", "Finish with the nuts, sprinkles and grated chocolate.", "Top with the nuts, coconut and a little honey."],
    ],
  },
  pt: {
    adj: ["Clássico", "Simples", "de Festa", "Especial"],
    tag: ["Um bolo de festa de verdade.", "Vale o esforço.", "Um show à parte.", "Massa fofa, recheio cremoso."],
    size: ["Faz um bolo de duas camadas.", "Faz um bolo de três camadas.", "Faz um bolo alto em camadas.", "Faz um grande bolo de festa."],
    serves: [8, 10, 12, 16],
    prep: [20, 30, 40, 45],
    chill: [15, 30, 45, 60],
    bake: [25, 30, 35, 40, 45],
    temp: [160, 170, 180, 190],
    title: (adj: string) => `# Bolo de Camadas ${adj}`,
    meta: (s: number, p: number, c: number, b: number, t: number) => `Rende ${s}. Preparo ${p} min, geladeira ${c} min, forno ${b} min a ${t}°C.`,
    ingHead: "## Ingredientes",
    methodHead: "## Modo de preparo",
    method: [
      ["Aqueça o forno e unte e forre as formas.", "Pré-aqueça o forno e forre as formas.", "Unte e forre as formas e aqueça o forno."],
      ["Bata a manteiga e o açúcar até clarear.", "Bata a manteiga com o açúcar até ficar fofo.", "Bata a manteiga e o açúcar até ficar claro e leve."],
      ["Junte os ovos um a um, batendo bem.", "Acrescente os ovos um a um.", "Adicione os ovos aos poucos, misturando."],
      ["Incorpore a farinha, a amêndoa e o fermento.", "Peneire a farinha e o fermento e misture delicadamente.", "Misture os ingredientes secos à massa."],
      ["Junte o leite, o óleo e o iogurte até ficar liso.", "Misture o iogurte, o leite e o óleo.", "Solte a massa com o leite, o óleo e o iogurte."],
      ["Divida nas formas e asse até crescer.", "Espalhe nas formas e asse até o palito sair limpo.", "Distribua nas formas e asse até dourar."],
      ["Deixe esfriar nas formas 10 minutos e desenforme.", "Deixe esfriar e desenforme sobre uma grade.", "Descanse 10 minutos e esfrie por completo."],
      ["Para o recheio, bata o creme com o açúcar de confeiteiro.", "Bata o creme e o açúcar até ponto de chantili.", "Bata o creme com o açúcar até engrossar."],
      ["Incorpore o mascarpone e depois a geleia e as frutas.", "Misture o mascarpone e faça ondas com a geleia.", "Junte o mascarpone e incorpore as frutas."],
      ["Recheie as camadas com o creme.", "Espalhe o recheio entre as camadas e empilhe.", "Empilhe os pães de ló com o recheio."],
      ["Para a cobertura, bata a manteiga, o açúcar e o cacau.", "Bata a manteiga com o açúcar e o cacau.", "Bata a manteiga, o açúcar e o cacau até ficar liso."],
      ["Cubra o bolo com a cobertura, juntando o chocolate e o leite.", "Espalhe a cobertura por cima e nas laterais.", "Cubra todo o bolo com a cobertura."],
      ["Decore com as nozes, o chocolate e açúcar polvilhado.", "Finalize com as nozes, o granulado e chocolate ralado.", "Cubra com as nozes, o coco e um pouco de mel."],
    ],
  },
};

// --- radices in fixed field order ------------------------------------------
// [adj, tag, size, serves, prep, chill, bake, temp, ...ingredients, ...method]
function radices(): number[] {
  const head = [T.en.adj.length, T.en.tag.length, T.en.size.length, T.en.serves.length, T.en.prep.length, T.en.chill.length, T.en.bake.length, T.en.temp.length];
  const ing = INGREDIENTS.map((g) => g.en.length * g.amounts.length);
  const method = T.en.method.map((m) => m.length);
  return [...head, ...ing, ...method];
}

export const RADICES = radices();
export const MAX_BYTES = (() => {
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
  const size = t.size[digits[k++]];
  const serves = t.serves[digits[k++]];
  const prep = t.prep[digits[k++]];
  const chill = t.chill[digits[k++]];
  const bake = t.bake[digits[k++]];
  const temp = t.temp[digits[k++]];

  const out: string[] = [t.title(adj), "", tag, size, "", t.meta(serves, prep, chill, bake, temp), "", t.ingHead];

  let ingIdx = 0;
  for (const sec of SECTIONS) {
    out.push(`### ${sec[lang]}`);
    for (let n = 0; n < sec.count; n++) {
      const g = INGREDIENTS[ingIdx++];
      const d = digits[k++];
      const amt = g.amounts[d % g.amounts.length];
      const name = g[lang][Math.floor(d / g.amounts.length)];
      const u = unitText(g.unit, lang);
      out.push(`- ${amt} ${u ? u + " " : ""}${name}`);
    }
  }

  out.push("", t.methodHead);
  t.method.forEach((variants, i) => out.push(`${i + 1}. ${variants[digits[k++]]}`));
  out.push("");
  return out.join("\n");
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
  digits.push(idx(t.adj, t.adj.find((a) => title.includes(a)), "title"));
  digits.push(idx(t.tag, t.tag.find((x) => lines.includes(x)), "subtitle"));
  digits.push(idx(t.size, t.size.find((x) => lines.includes(x)), "size"));

  const meta = lines.find((l) => /min.*°C/.test(l)) ?? "";
  const nums = meta.match(/\d+/g)?.map(Number) ?? [];
  digits.push(idx(t.serves, nums[0], "servings"));
  digits.push(idx(t.prep, nums[1], "prep time"));
  digits.push(idx(t.chill, nums[2], "chill time"));
  digits.push(idx(t.bake, nums[3], "bake time"));
  digits.push(idx(t.temp, nums[4], "temperature"));

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
      return intToBytes(fromDigits(parseDigits(text, lang), RADICES));
    } catch { /* try the other language */ }
  }
  throw new Error("this recipe does not decode to a message");
}

export function toMessage(bytes: Uint8Array): string { return dec.decode(bytes); }
export function fromMessage(s: string): Uint8Array { return enc.encode(s); }
