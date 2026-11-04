import { cookies } from 'next/headers'
import type { Payload } from 'payload'

import { resolveActiveTenant, resolveBranding } from '@/branding/resolveTenant'
import type { User } from '@/payload-types'

/** Server-side: the authorised active tenant for this request (never cached across users: it reads cookies). */
export async function getActiveTenant(payload: Payload, user: unknown) {
  const jar = await cookies()
  return resolveActiveTenant({ payload, user: user as User | null, cookieValue: jar.get('payload-tenant')?.value })
}

/** Server-side: the brand to show: the selected store's, or the platform's (Made Design). */
export async function getActiveBranding(payload: Payload, user: unknown) {
  const jar = await cookies()
  return resolveBranding({ payload, user: (user ?? null) as User | null, cookieValue: jar.get('payload-tenant')?.value })
}
