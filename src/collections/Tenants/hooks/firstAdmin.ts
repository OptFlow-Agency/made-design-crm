import type { CollectionAfterChangeHook, CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

const VIRTUAL = ['adminName', 'adminEmail', 'adminPassword'] as const

/** Validates the optional first-admin fields and keeps them in the request context only (they are never stored on the tenant). */
export const captureFirstAdmin: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data
  const email = String(data.adminEmail ?? '').trim().toLowerCase()
  const password = String(data.adminPassword ?? '')
  const name = String(data.adminName ?? '').trim()
  for (const key of VIRTUAL) delete (data as Record<string, unknown>)[key]
  if (!email && !password) return data

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new APIError('Enter a valid email for the first admin', 400)
  if (password.length < 10) throw new APIError('The first admin\'s password needs at least 10 characters', 400)
  const taken = await req.payload.count({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, req })
  if (taken.totalDocs > 0) throw new APIError('A user with that email already exists', 400)

  req.context.firstAdmin = { email, password, name }
  return data
}

/** Creates the store's first admin in the same transaction, so a failure leaves neither tenant nor user behind. */
export const createFirstAdmin: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  const first = req.context?.firstAdmin as { email: string; password: string; name: string } | undefined
  if (operation !== 'create' || !first) return doc
  delete req.context.firstAdmin
  await req.payload.create({
    collection: 'users',
    data: { email: first.email, password: first.password, name: first.name || undefined, roles: ['tenant-admin'], tenants: [{ tenant: doc.id }] } as never,
    context: { skipStaffGuard: true },
    overrideAccess: true,
    req,
  })
  return doc
}
