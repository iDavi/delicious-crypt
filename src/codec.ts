// Mixed-radix codec: the message is one big integer, spread across every
// natural choice in the recipe (a "digit" each). No single field looks like
// data. Bijective and keyless.

export function bytesToInt(bytes: Uint8Array): bigint {
  // 0x01 marker keeps leading zero bytes from vanishing.
  let n = 1n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  return n;
}

export function intToBytes(n: bigint): Uint8Array {
  const out: number[] = [];
  while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  out.shift(); // drop the 0x01 marker
  return new Uint8Array(out);
}

// integer -> one digit per radix (least significant first)
export function toDigits(n: bigint, radices: number[]): number[] {
  const digits: number[] = [];
  for (const r of radices) {
    digits.push(Number(n % BigInt(r)));
    n /= BigInt(r);
  }
  if (n > 0n) throw new Error("message is too long for one recipe");
  return digits;
}

export function fromDigits(digits: number[], radices: number[]): bigint {
  let n = 0n, place = 1n;
  for (let i = 0; i < radices.length; i++) {
    n += BigInt(digits[i]) * place;
    place *= BigInt(radices[i]);
  }
  return n;
}

export function capacity(radices: number[]): bigint {
  return radices.reduce((p, r) => p * BigInt(r), 1n);
}
