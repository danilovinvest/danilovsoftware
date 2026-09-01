/**
 * Avatars en dégradé, algorithme de vercel/avatar.
 *
 * Le service public (avatar.vercel.sh) prend la chaîne dans l'URL : s'en servir
 * pour un CRM enverrait les adresses e-mail du bureau d'études à un tiers, à
 * chaque affichage de liste, pour dessiner une pastille. L'algorithme est
 * reproduit ici à l'identique — SHA-1 de la chaîne, somme des octets modulo
 * 360 pour la teinte, triade pour la seconde couleur — de sorte que le rendu
 * est le même et que rien ne quitte le navigateur.
 */

/**
 * SHA-1 synchrone.
 *
 * `crypto.subtle.digest` est asynchrone : l'utiliser obligerait chaque avatar à
 * se peindre en deux temps, avec un état à synchroniser pour une couleur. Une
 * implémentation directe rend la couleur disponible au premier rendu.
 */
function sha1(input: string): Uint8Array {
  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;

  // Bourrage : un 1, des 0, puis la longueur sur 64 bits — le tout aligné sur
  // 64 octets.
  const total = (((bytes.length + 8) >> 6) + 1) << 6;
  const block = new Uint8Array(total);
  block.set(bytes);
  block[bytes.length] = 0x80;

  const view = new DataView(block.buffer);
  view.setUint32(total - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(total - 4, bitLength >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 80; i++) {
      const mixed = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (mixed << 1) | (mixed >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const next = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = next;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const out = new DataView(digest.buffer);
  out.setUint32(0, h0);
  out.setUint32(4, h1);
  out.setUint32(8, h2);
  out.setUint32(12, h3);
  out.setUint32(16, h4);
  return digest;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = l - chroma / 2;

  const sector = Math.floor(hue / 60) % 6;
  const [r, g, b] = (
    [
      [chroma, secondary, 0],
      [secondary, chroma, 0],
      [0, chroma, secondary],
      [0, secondary, chroma],
      [secondary, 0, chroma],
      [chroma, 0, secondary],
    ] as const
  )[sector];

  const channel = (value: number) =>
    Math.round((value + offset) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export type AvatarGradient = { from: string; to: string };

/**
 * Deux couleurs déterministes pour une chaîne donnée : la même adresse rendra
 * toujours le même avatar, sur tous les postes, sans rien mémoriser.
 */
export function avatarGradient(seed: string): AvatarGradient {
  let sum = 0;
  for (const byte of sha1(seed)) sum += byte;
  const hue = sum % 360;

  return {
    from: hslToHex(hue, 95, 50),
    // tinycolor().triad()[1] chez vercel/avatar : un tiers de tour.
    to: hslToHex((hue + 120) % 360, 95, 50),
  };
}
