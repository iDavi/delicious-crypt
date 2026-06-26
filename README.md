# delicious-crypt

Hide a short message inside a loaf-cake recipe, and read it back. The recipe is
meant to pass as a normal recipe — nothing in it looks like data.

## How it works

The message is turned into one big integer and written across every choice the
recipe makes: title adjective, servings, oven temperature, prep/bake times, which
name each ingredient uses ("plain flour" vs "cake flour"), the exact amounts, the
add-ins, and the wording of each step. Each choice is one digit of a mixed-radix
number, so no single field carries the message and every value on its own is a
thing real recipes vary. Decoding reads the same choices back in the same order.

No password. The recipe is the message; anyone with this tool can read it. It
hides in plain sight, it does not protect against someone who knows the scheme.

A recipe holds about 33 bytes. Longer messages are split into several recipes (a
recipe collection); decoding joins them back, so there is no fixed length limit.

## CLI

```
npm install
npm run build

node dist/cli.js encrypt "meet at six" -l en
node dist/cli.js encrypt "café 8h" -l pt
node dist/cli.js encrypt "secret" | node dist/cli.js decrypt
```

`-l` is `en` or `pt` (default `en`). `decrypt` reads a file argument or stdin and
auto-detects the language.

## Demo

GitHub Pages serves `docs/`. Open `docs/index.html` (no build needed once
`docs/js` is committed). Run `npm run build` to regenerate it.

## Português

Esconde uma mensagem curta dentro de uma receita de bolo e lê de volta. A
mensagem vira um número e é espalhada por todas as escolhas da receita (nomes dos
ingredientes, quantidades, tempos, passos). Sem senha: a receita é a mensagem.
Cada receita guarda ~33 bytes; mensagens maiores viram várias receitas.
