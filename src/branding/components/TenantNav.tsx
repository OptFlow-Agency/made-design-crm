import { DefaultNav } from '@payloadcms/next/rsc'
import React from 'react'

import { hiddenCollectionsFor } from '@/access/modules'
import type { TenantModule } from '@/branding/config'

import { getActiveBranding } from './getContext'

/**
 * Default Payload nav, minus the areas the store hasn't enabled and the ones this user wasn't given.
 * Display only: collection access control still decides what the user can read or write.
 */
const TenantNav = async (props: any) => {
  const active = await getActiveBranding(props.payload, props.user)
  const hidden = new Set(hiddenCollectionsFor(props.user, active.modules as TenantModule[]))
  if (!hidden.size) return <DefaultNav {...props} />
  const visibleEntities = { ...props.visibleEntities, collections: props.visibleEntities.collections.filter((s: string) => !hidden.has(s)) }
  return <DefaultNav {...props} visibleEntities={visibleEntities} />
}
export default TenantNav
