import { COLOR_KEYS, FONT_OPTIONS, HEX_COLOR, RADIUS_OPTIONS, type ColorKey, type TenantBranding } from './config'

/** Used for any colour a tenant leaves empty. Neutral, so unbranded tenants look like stock Payload. */
export const FALLBACK_COLORS: Record<ColorKey, string> = {
  primary: '#111111',
  secondary: '#555555',
  accent: '#2563eb',
  background: '#ffffff',
  surface: '#f5f5f5',
  foreground: '#111111',
  muted: '#666666',
  border: '#e5e5e5',
}

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
const lin = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
export const luminance = (hex: string) => 0.2126 * lin(channel(hex, 0)) + 0.7152 * lin(channel(hex, 1)) + 0.0722 * lin(channel(hex, 2))
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const mix = (a: string, b: string, weightB: number) =>
  '#' +
  [0, 1, 2]
    .map((i) => Math.round(channel(a, i) * (1 - weightB) + channel(b, i) * weightB).toString(16).padStart(2, '0'))
    .join('')

/** Black or white, whichever reads better on `bg`. */
export const readableOn = (bg: string) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111')

/** Nudges `colour` towards `towards` until it reaches `min` contrast against `against`. */
export const ensureContrast = (colour: string, against: string, towards: string, min: number) => {
  let out = colour
  for (let step = 1; step <= 10 && contrast(out, against) < min; step++) out = mix(colour, towards, step / 10)
  return out
}

const pick = (value: string | null | undefined, fallback: string) => (value && HEX_COLOR.test(value) ? value.toLowerCase() : fallback)

export type ResolvedTheme = {
  light: Record<ColorKey, string> & { onPrimary: string; accentText: string }
  dark: Record<ColorKey, string> & { onPrimary: string; accentText: string }
  radius: string
  headingStack: string
  bodyStack: string
  /** Body font if it is a sans-serif (fit for dense UI), otherwise null and the interface uses Inter. */
  uiStack: string | null
  /** Display serifs run small; this scales brand headings up so they hold their weight. */
  headingAdjust: number
  googleFamilies: string[]
  defaultTheme: 'light' | 'dark' | 'system'
}

/** Validates and completes a tenant's branding. Every output value comes from an allowlist or a validated hex. */
export function resolveTheme(branding: TenantBranding | null | undefined): ResolvedTheme {
  const c = branding?.colors ?? {}
  const light = Object.fromEntries(COLOR_KEYS.map((k) => [k, pick(c[k], FALLBACK_COLORS[k])])) as Record<ColorKey, string>

  // Dark palette: derived, so tenants only maintain one set of colours.
  const darkBg = mix(light.foreground, '#000000', 0.55)
  const darkFg = mix(light.background, '#ffffff', 0.0)
  const dark = {
    background: darkBg,
    surface: mix(darkBg, darkFg, 0.08),
    foreground: darkFg,
    muted: mix(darkBg, darkFg, 0.62),
    border: mix(darkBg, darkFg, 0.18),
    primary: ensureContrast(light.accent, darkBg, '#ffffff', 4.5),
    secondary: ensureContrast(light.secondary, darkBg, '#ffffff', 4.5),
    accent: ensureContrast(light.accent, darkBg, '#ffffff', 4.5),
  } as Record<ColorKey, string>

  const font = (key: string | null | undefined, fallback: string) => FONT_OPTIONS.find((f) => f.value === key) ?? FONT_OPTIONS.find((f) => f.value === fallback)!
  const heading = font(branding?.typography?.headingFont, 'system')
  const body = font(branding?.typography?.bodyFont, 'system')
  const families = [heading, body].flatMap((f) => ('google' in f ? [f.google] : []))

  return {
    light: { ...light, onPrimary: readableOn(light.primary), accentText: ensureContrast(light.accent, light.background, light.foreground, 4.5) },
    dark: { ...dark, onPrimary: readableOn(dark.primary), accentText: ensureContrast(dark.accent, dark.background, '#ffffff', 4.5) },
    radius: RADIUS_OPTIONS.find((r) => r.value === branding?.appearance?.borderRadius)?.value ?? '8px',
    headingStack: heading.stack,
    bodyStack: body.stack,
    uiStack: body.value !== 'system' && body.stack.endsWith('sans-serif') ? body.stack : null,
    headingAdjust: heading.stack.endsWith('sans-serif') ? 1 : 1.3,
    googleFamilies: [...new Set(families)],
    defaultTheme: branding?.appearance?.defaultTheme ?? 'system',
  }
}

const palette = (p: ResolvedTheme['light']) => `
  --tenant-primary:${p.primary};--tenant-on-primary:${p.onPrimary};--tenant-secondary:${p.secondary};--tenant-accent:${p.accent};--tenant-accent-text:${p.accentText};
  --tenant-background:${p.background};--tenant-surface:${p.surface};--tenant-foreground:${p.foreground};
  --tenant-muted:${p.muted};--tenant-border:${p.border};
  --theme-bg:${p.background};--theme-text:${p.foreground};--theme-border-color:${p.border};--theme-input-bg:${p.background};
  --theme-elevation-0:${p.background};
  --theme-elevation-50:color-mix(in srgb,${p.background} 96%,${p.foreground});
  --theme-elevation-100:color-mix(in srgb,${p.background} 92%,${p.foreground});
  --theme-elevation-150:color-mix(in srgb,${p.background} 88%,${p.foreground});
  --theme-elevation-200:color-mix(in srgb,${p.background} 82%,${p.foreground});
  --theme-elevation-300:color-mix(in srgb,${p.background} 70%,${p.foreground});
  --theme-elevation-400:color-mix(in srgb,${p.background} 56%,${p.foreground});
  --theme-elevation-500:${p.muted};
  --theme-elevation-600:color-mix(in srgb,${p.muted} 70%,${p.foreground});
  --theme-elevation-700:color-mix(in srgb,${p.muted} 40%,${p.foreground});
  --theme-elevation-800:${p.primary};
  --theme-elevation-900:${p.foreground};
  --theme-elevation-1000:${p.foreground};`

/**
 * Builds the stylesheet for one tenant. Only validated hex colours and allowlisted font stacks,
 * radii and Google family specs are interpolated, so there's no path for tenant-supplied CSS.
 * It overrides Payload's documented CSS variables, plus the stable `.btn--style-primary` class.
 */
export function buildThemeCss(theme: ResolvedTheme): string {
  return `
:root{${palette(theme.light)}
  --style-radius-s:calc(${theme.radius} * .5);--style-radius-m:${theme.radius};--style-radius-l:calc(${theme.radius} * 1.5);
  --tenant-heading-font:${theme.headingStack};--tenant-body-font:${theme.bodyStack};--tenant-heading-adjust:${theme.headingAdjust};${theme.uiStack ? `--tenant-ui-font:${theme.uiStack};` : ''}}
html[data-theme='dark']{${palette(theme.dark)}}
.btn--style-primary{background:var(--tenant-primary);border-color:var(--tenant-primary);color:var(--tenant-on-primary)}
.btn--style-primary:hover:not(.btn--disabled){background:color-mix(in srgb,var(--tenant-primary) 88%,var(--tenant-foreground));border-color:transparent}
.btn--style-primary svg .stroke,.btn--style-primary svg path{stroke:currentColor}
a:not(.btn):not(.ds-link):not(.ds-btn):not(.card__title):hover{color:var(--tenant-primary)}
.tenant-logo--dark{display:none}
html[data-theme='dark'] .tenant-logo--has-dark{display:none}
html[data-theme='dark'] .tenant-logo--dark{display:inline}
:focus-visible{outline:2px solid var(--tenant-primary);outline-offset:2px}
`.replace(/\s*\n\s*/g, '\n').trim()
}

/** The interface font (Inter) is always loaded; tenant fonts are added for brand moments only. */
const UI_FONT = 'Inter:wght@400;450;500;600;700'
export const googleFontsHref = (theme: ResolvedTheme) =>
  `https://fonts.googleapis.com/css2?${[UI_FONT, ...theme.googleFamilies.filter((f) => !f.startsWith('Inter:'))].map((f) => `family=${f}`).join('&')}&display=swap`
