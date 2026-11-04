import { postgresAdapter } from '@payloadcms/db-postgres'
import {
  BoldFeature,
  EXPERIMENTAL_TableFeature,
  IndentFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import sharp from 'sharp'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from '@/collections/Categories'
import { Customers } from '@/collections/Customers'
import { Media } from '@/collections/Media'
import { Offers } from '@/collections/Offers'
import { Orders } from '@/collections/Orders'
import { Products } from '@/collections/Products'
import { PromoCodes } from '@/collections/PromoCodes'
import { Reviews } from '@/collections/Reviews'
import { ShippingZones } from '@/collections/ShippingZones'
import { StoreSettings } from '@/collections/StoreSettings'
import { PlatformMedia } from '@/collections/PlatformMedia'
import { Tenants } from '@/collections/Tenants'
import { Users } from '@/collections/Users'
import { PlatformSettings } from '@/globals/PlatformSettings'
import { storeEndpoints } from '@/endpoints/store'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      header: ['@/branding/components/TenantTheme#default'],
      beforeLogin: ['@/branding/components/LoginTheme#default'],
      Nav: '@/branding/components/TenantNav#default',
      beforeDashboard: ['@/branding/components/TenantDashboardIntro#default'],
      graphics: { Icon: '@/branding/components/TenantLogo#default', Logo: '@/branding/components/TenantLogo#default' },
    },
  },
  collections: [
    Tenants,
    Users,
    PlatformMedia,
    Media,
    Categories,
    Products,
    Customers,
    Orders,
    PromoCodes,
    Offers,
    Reviews,
    ShippingZones,
    StoreSettings,
  ],
  globals: [PlatformSettings],
  db: postgresAdapter({
    // UUID primary keys on every table (ids are strings throughout the code).
    idType: 'uuid',
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: [],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),
  //email: nodemailerAdapter(),
  endpoints: storeEndpoints,
  plugins,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  sharp,
})
