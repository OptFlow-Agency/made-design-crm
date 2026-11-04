import React from 'react'

import { getActiveBranding } from './getContext'
import { ThemeStyle } from './ThemeStyle'

/** Admin `header` slot, rendered on every page: the brand of the selected store, or of the platform. */
const TenantTheme = async ({ payload, user }: any) => <ThemeStyle active={await getActiveBranding(payload, user)} user={user} />
export default TenantTheme
