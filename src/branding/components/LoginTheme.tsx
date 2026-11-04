import React from 'react'

import { getActiveBranding } from './getContext'
import { ThemeStyle } from './ThemeStyle'

/** The login page has no `header` slot, so the platform brand is applied from `beforeLogin`. */
const LoginTheme = async ({ payload }: any) => <ThemeStyle active={await getActiveBranding(payload, null)} />
export default LoginTheme
