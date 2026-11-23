import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The storage plugin's `_objectKey` (and `platform-media`'s `prefix`) columns were dropped from the shared
// database by a dev-mode schema push from a machine without S3 env vars. Idempotent so it is safe on any DB.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  ALTER TABLE "platform_media" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT 'platform';
  ALTER TABLE "platform_media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "platform_media" DROP COLUMN IF EXISTS "_objectkey";
  ALTER TABLE "platform_media" DROP COLUMN IF EXISTS "prefix";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";`)
}
