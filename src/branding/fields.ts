import type { Field } from 'payload'

import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'

import { COLOR_KEYS, FONT_OPTIONS, HEX_COLOR, MODULES, MODULE_LABELS, RADIUS_OPTIONS, THEME_OPTIONS } from './config'

const hex = (v: string | null | undefined) => (!v || HEX_COLOR.test(v) ? true : 'Use a 6-digit hex colour such as #e8480c')

/** The branding group, shared by tenants (uploads go to `media`) and the platform (uploads go to `platform-media`). */
export const brandingGroup = (mediaSlug: 'media' | 'platform-media'): Field => ({
    name: 'branding',
    type: 'group',
    admin: { description: 'How this client\'s dashboard looks. Empty values fall back to neutral defaults.' },
    fields: [
      { name: 'logo', type: 'upload', relationTo: mediaSlug, admin: { description: 'Shown in the navigation and on light backgrounds.' } },
      { name: 'logoDark', type: 'upload', relationTo: mediaSlug, admin: { description: 'Optional variant for dark mode.' } },
      { name: 'favicon', type: 'upload', relationTo: mediaSlug },
      {
        name: 'colors',
        type: 'group',
        fields: COLOR_KEYS.map((key) => ({ name: key, type: 'text' as const, validate: hex, admin: { placeholder: '#000000', width: '25%' } })),
      },
      {
        name: 'typography',
        type: 'group',
        fields: ['headingFont', 'bodyFont'].map((name) => ({
          name,
          type: 'select' as const,
          defaultValue: 'system',
          options: FONT_OPTIONS.map(({ label, value }) => ({ label, value })),
          admin: { width: '50%' },
        })),
      },
      {
        name: 'appearance',
        type: 'group',
        fields: [
          { name: 'borderRadius', type: 'select', defaultValue: '8px', options: [...RADIUS_OPTIONS], admin: { width: '50%' } },
          { name: 'defaultTheme', type: 'select', defaultValue: 'system', options: THEME_OPTIONS.map((v) => ({ label: v, value: v })), admin: { width: '50%' } },
        ],
      },
    ],
})

export const brandingFields: Field[] = [
  brandingGroup('media'),
  {
    name: 'modules',
    type: 'select',
    hasMany: true,
    options: MODULES.filter((m) => m !== 'overview').map((m) => ({ label: MODULE_LABELS[m], value: m })),
    access: { create: adminOnlyFieldAccess, update: adminOnlyFieldAccess },
    admin: { position: 'sidebar', description: 'Navigation sections shown to this client. Leave empty to show everything. This only hides links; permissions are enforced separately.' },
  },
]
