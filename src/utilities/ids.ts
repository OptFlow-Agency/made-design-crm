/** Every document id is a UUID string. */
export type Id = string

/** A UUID as Payload generates them; anything else (a forged cookie, a stray number) is not an id. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isId = (v: unknown): v is Id => typeof v === 'string' && UUID.test(v)

/** The id of a relationship value, whether it is populated (an object), a bare id, or empty. */
export const idOf = (ref: unknown): Id | undefined => {
  if (typeof ref === 'string') return ref
  if (ref && typeof ref === 'object' && 'id' in ref) return idOf((ref as { id: unknown }).id)
  return undefined
}
