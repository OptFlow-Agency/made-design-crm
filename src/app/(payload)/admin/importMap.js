import { WatchTenantCollection as WatchTenantCollection_1d0591e3cf4f332c83a86da13a0de59a } from '@payloadcms/plugin-multi-tenant/client'
import { TenantField as TenantField_1d0591e3cf4f332c83a86da13a0de59a } from '@payloadcms/plugin-multi-tenant/client'
import { AssignTenantFieldTrigger as AssignTenantFieldTrigger_1d0591e3cf4f332c83a86da13a0de59a } from '@payloadcms/plugin-multi-tenant/client'
import { StatusCell as StatusCell_8f206b1664610466b0d12ec5acac877d } from '@/collections/Orders/components/StatusCell'
import { ItemImage as ItemImage_2dbb96502eb0a33120ce60b293ab2eac } from '@/collections/Orders/components/ItemImage'
import { ItemRowLabel as ItemRowLabel_116fd2adf2922e64d46879fcae836caa } from '@/collections/Orders/components/ItemRowLabel'
import { default as default_6a5f33ff22f530eb404ca8dbbe206e53 } from '@/admin/nav/AdminNav'
import { default as default_a22c28c60d02fe8f4d5347817c1f97fc } from '@/branding/components/TenantTheme'
import { default as default_dbc14d6794083f6be732d2ca97ea9876 } from '@/branding/components/TenantIcon'
import { default as default_d2cc820fd4a6975b1bbc6bfa59359058 } from '@/branding/components/TenantLogo'
import { default as default_ef5677aa6c86741b9957f482d1c38032 } from '@/admin/nav/HeaderSearch'
import { GlobalViewRedirect as GlobalViewRedirect_d6d5f193a167989e2ee7d14202901e62 } from '@payloadcms/plugin-multi-tenant/rsc'
import { default as default_7513a4c273ac2d8d60e78174ba982659 } from '@/branding/components/LoginTheme'
import { TenantSelector as TenantSelector_d6d5f193a167989e2ee7d14202901e62 } from '@payloadcms/plugin-multi-tenant/rsc'
import { TenantSelectionProvider as TenantSelectionProvider_d6d5f193a167989e2ee7d14202901e62 } from '@payloadcms/plugin-multi-tenant/rsc'
import { default as default_a6cb646022b8157984a9630293780eb1 } from '@/admin/dashboard/DashboardView'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@payloadcms/plugin-multi-tenant/client#WatchTenantCollection": WatchTenantCollection_1d0591e3cf4f332c83a86da13a0de59a,
  "@payloadcms/plugin-multi-tenant/client#TenantField": TenantField_1d0591e3cf4f332c83a86da13a0de59a,
  "@payloadcms/plugin-multi-tenant/client#AssignTenantFieldTrigger": AssignTenantFieldTrigger_1d0591e3cf4f332c83a86da13a0de59a,
  "@/collections/Orders/components/StatusCell#StatusCell": StatusCell_8f206b1664610466b0d12ec5acac877d,
  "@/collections/Orders/components/ItemImage#ItemImage": ItemImage_2dbb96502eb0a33120ce60b293ab2eac,
  "@/collections/Orders/components/ItemRowLabel#ItemRowLabel": ItemRowLabel_116fd2adf2922e64d46879fcae836caa,
  "@/admin/nav/AdminNav#default": default_6a5f33ff22f530eb404ca8dbbe206e53,
  "@/branding/components/TenantTheme#default": default_a22c28c60d02fe8f4d5347817c1f97fc,
  "@/branding/components/TenantIcon#default": default_dbc14d6794083f6be732d2ca97ea9876,
  "@/branding/components/TenantLogo#default": default_d2cc820fd4a6975b1bbc6bfa59359058,
  "@/admin/nav/HeaderSearch#default": default_ef5677aa6c86741b9957f482d1c38032,
  "@payloadcms/plugin-multi-tenant/rsc#GlobalViewRedirect": GlobalViewRedirect_d6d5f193a167989e2ee7d14202901e62,
  "@/branding/components/LoginTheme#default": default_7513a4c273ac2d8d60e78174ba982659,
  "@payloadcms/plugin-multi-tenant/rsc#TenantSelector": TenantSelector_d6d5f193a167989e2ee7d14202901e62,
  "@payloadcms/plugin-multi-tenant/rsc#TenantSelectionProvider": TenantSelectionProvider_d6d5f193a167989e2ee7d14202901e62,
  "@/admin/dashboard/DashboardView#default": default_a6cb646022b8157984a9630293780eb1,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24
}
