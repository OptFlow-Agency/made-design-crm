/**
 * Moroccan phone helpers, ported from the Maison Sabra storefront so every
 * client store matches customers on the same canonical form (`0612345678`).
 */
export function normalizePhone(raw: unknown): string {
  const s = String(raw ?? '').replace(/[\s.\-()‎‏ ]/g, '')
  let rest: string | null = null
  if (s.startsWith('+212')) rest = s.slice(4)
  else if (s.startsWith('00212')) rest = s.slice(5)
  else if (/^212\d{9}$/.test(s)) rest = s.slice(3)
  if (rest !== null) return rest.startsWith('0') ? rest : `0${rest}`
  return s
}

export const isValidMoroccanPhone = (raw: unknown): boolean =>
  /^0[5-7]\d{8}$/.test(normalizePhone(raw))
