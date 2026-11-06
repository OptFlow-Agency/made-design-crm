import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_gallery_kind" AS ENUM('front', 'back', 'side', 'interior', 'detail', 'lifestyle');
  CREATE TYPE "public"."enum_products_benefits_icon" AS ENUM('hand', 'gem', 'leather', 'sparkle', 'bag', 'chain', 'palette', 'heritage', 'gift', 'truck', 'return', 'shield', 'heart', 'ruler');
  CREATE TYPE "public"."enum_stories_kind" AS ENUM('craftsmanship', 'inspiration', 'editorial', 'brand');
  CREATE TYPE "public"."enum_content_sections_placement" AS ENUM('home', 'shop', 'collection', 'product', 'checkout', 'global');
  CREATE TYPE "public"."enum_content_sections_type" AS ENUM('hero', 'banner', 'cta', 'text', 'announcement', 'featured-products', 'story');
  CREATE TYPE "public"."enum_store_settings_payment_methods_key" AS ENUM('cod', 'bank-transfer', 'card', 'other');
  CREATE TYPE "public"."enum_store_settings_tracked_events" AS ENUM('product_view', 'variant_select', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'purchase', 'promo_code');
  CREATE TABLE "categories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" uuid
  );
  
  CREATE TABLE "products_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_products_benefits_icon" DEFAULT 'sparkle',
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "products_details_extra" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "stories_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "stories" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_stories_kind" DEFAULT 'craftsmanship' NOT NULL,
  	"kicker" varchar,
  	"excerpt" varchar,
  	"body" varchar,
  	"cover_image_id" uuid,
  	"verified" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"active" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_title_en" varchar,
  	"seo_description_en" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" uuid
  );
  
  CREATE TABLE "content_sections" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"tenant_id" uuid,
  	"name" varchar NOT NULL,
  	"placement" "enum_content_sections_placement" DEFAULT 'home' NOT NULL,
  	"type" "enum_content_sections_type" DEFAULT 'banner' NOT NULL,
  	"kicker" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"image_id" uuid,
  	"image_mobile_id" uuid,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"collection_id" uuid,
  	"story_id" uuid,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"active" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_sections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" uuid
  );
  
  CREATE TABLE "store_settings_shipping_destinations" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"cost" numeric,
  	"estimate" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "store_settings_payment_methods" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"key" "enum_store_settings_payment_methods_key" DEFAULT 'cod' NOT NULL,
  	"description" varchar,
  	"icon_id" uuid,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "store_settings_trust_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "store_settings_tracked_events" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_store_settings_tracked_events",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "categories" ADD COLUMN "hero_image_id" uuid;
  ALTER TABLE "categories" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_title_en" varchar;
  ALTER TABLE "categories" ADD COLUMN "seo_description_en" varchar;
  ALTER TABLE "categories" ADD COLUMN "featured" boolean DEFAULT false;
  ALTER TABLE "categories" ADD COLUMN "seasonal" boolean DEFAULT false;
  ALTER TABLE "categories" ADD COLUMN "season_label" varchar;
  ALTER TABLE "products_gallery" ADD COLUMN "kind" "enum_products_gallery_kind" DEFAULT 'front';
  ALTER TABLE "products_variants" ADD COLUMN "color_hex" varchar;
  ALTER TABLE "products_variants" ADD COLUMN "active" boolean DEFAULT true;
  ALTER TABLE "products" ADD COLUMN "short_description" varchar;
  ALTER TABLE "products" ADD COLUMN "details_materials" varchar;
  ALTER TABLE "products" ADD COLUMN "details_width" numeric;
  ALTER TABLE "products" ADD COLUMN "details_height" numeric;
  ALTER TABLE "products" ADD COLUMN "details_depth" numeric;
  ALTER TABLE "products" ADD COLUMN "details_strap_drop" numeric;
  ALTER TABLE "products" ADD COLUMN "details_weight" numeric;
  ALTER TABLE "products" ADD COLUMN "details_care" varchar;
  ALTER TABLE "products" ADD COLUMN "craftsmanship_title" varchar;
  ALTER TABLE "products" ADD COLUMN "craftsmanship_story" varchar;
  ALTER TABLE "products" ADD COLUMN "craftsmanship_image_id" uuid;
  ALTER TABLE "products" ADD COLUMN "craftsmanship_brand_story_id" uuid;
  ALTER TABLE "products" ADD COLUMN "craftsmanship_claims_verified" boolean DEFAULT false;
  ALTER TABLE "products" ADD COLUMN "promotion_sale_price" numeric;
  ALTER TABLE "products" ADD COLUMN "promotion_label" varchar;
  ALTER TABLE "products" ADD COLUMN "promotion_starts_at" timestamp(3) with time zone;
  ALTER TABLE "products" ADD COLUMN "promotion_ends_at" timestamp(3) with time zone;
  ALTER TABLE "products" ADD COLUMN "low_stock_threshold" numeric;
  ALTER TABLE "products" ADD COLUMN "seo_title_en" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_description_en" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_image_id" uuid;
  ALTER TABLE "products" ADD COLUMN "seo_canonical_url" varchar;
  ALTER TABLE "products" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false;
  ALTER TABLE "reviews" ADD COLUMN "title" varchar;
  ALTER TABLE "reviews" ADD COLUMN "reply" varchar;
  ALTER TABLE "store_settings" ADD COLUMN "low_stock_threshold" numeric DEFAULT 5;
  ALTER TABLE "store_settings" ADD COLUMN "returns_window_days" numeric;
  ALTER TABLE "store_settings" ADD COLUMN "returns_summary" varchar;
  ALTER TABLE "store_settings" ADD COLUMN "returns_exchange_conditions" varchar;
  ALTER TABLE "store_settings" ADD COLUMN "checkout_guest_checkout" boolean DEFAULT true;
  ALTER TABLE "store_settings" ADD COLUMN "checkout_ask_email" boolean DEFAULT false;
  ALTER TABLE "store_settings" ADD COLUMN "checkout_confirmation_message" varchar;
  ALTER TABLE "store_settings" ADD COLUMN "checkout_notify_email" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stories_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_sections_id" uuid;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_benefits" ADD CONSTRAINT "products_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_details_extra" ADD CONSTRAINT "products_details_extra_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_images" ADD CONSTRAINT "stories_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_images" ADD CONSTRAINT "stories_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_collection_id_categories_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_sections_rels" ADD CONSTRAINT "content_sections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_sections_rels" ADD CONSTRAINT "content_sections_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings_shipping_destinations" ADD CONSTRAINT "store_settings_shipping_destinations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings_payment_methods" ADD CONSTRAINT "store_settings_payment_methods_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "store_settings_payment_methods" ADD CONSTRAINT "store_settings_payment_methods_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings_trust_highlights" ADD CONSTRAINT "store_settings_trust_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings_tracked_events" ADD CONSTRAINT "store_settings_tracked_events_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_rels_order_idx" ON "categories_rels" USING btree ("order");
  CREATE INDEX "categories_rels_parent_idx" ON "categories_rels" USING btree ("parent_id");
  CREATE INDEX "categories_rels_path_idx" ON "categories_rels" USING btree ("path");
  CREATE INDEX "categories_rels_products_id_idx" ON "categories_rels" USING btree ("products_id");
  CREATE INDEX "products_benefits_order_idx" ON "products_benefits" USING btree ("_order");
  CREATE INDEX "products_benefits_parent_id_idx" ON "products_benefits" USING btree ("_parent_id");
  CREATE INDEX "products_details_extra_order_idx" ON "products_details_extra" USING btree ("_order");
  CREATE INDEX "products_details_extra_parent_id_idx" ON "products_details_extra" USING btree ("_parent_id");
  CREATE INDEX "stories_images_order_idx" ON "stories_images" USING btree ("_order");
  CREATE INDEX "stories_images_parent_id_idx" ON "stories_images" USING btree ("_parent_id");
  CREATE INDEX "stories_images_image_idx" ON "stories_images" USING btree ("image_id");
  CREATE INDEX "stories_tenant_idx" ON "stories" USING btree ("tenant_id");
  CREATE INDEX "stories_slug_idx" ON "stories" USING btree ("slug");
  CREATE INDEX "stories_cover_image_idx" ON "stories" USING btree ("cover_image_id");
  CREATE INDEX "stories_updated_at_idx" ON "stories" USING btree ("updated_at");
  CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");
  CREATE INDEX "stories_rels_order_idx" ON "stories_rels" USING btree ("order");
  CREATE INDEX "stories_rels_parent_idx" ON "stories_rels" USING btree ("parent_id");
  CREATE INDEX "stories_rels_path_idx" ON "stories_rels" USING btree ("path");
  CREATE INDEX "stories_rels_products_id_idx" ON "stories_rels" USING btree ("products_id");
  CREATE INDEX "content_sections_tenant_idx" ON "content_sections" USING btree ("tenant_id");
  CREATE INDEX "content_sections_image_idx" ON "content_sections" USING btree ("image_id");
  CREATE INDEX "content_sections_image_mobile_idx" ON "content_sections" USING btree ("image_mobile_id");
  CREATE INDEX "content_sections_collection_idx" ON "content_sections" USING btree ("collection_id");
  CREATE INDEX "content_sections_story_idx" ON "content_sections" USING btree ("story_id");
  CREATE INDEX "content_sections_updated_at_idx" ON "content_sections" USING btree ("updated_at");
  CREATE INDEX "content_sections_created_at_idx" ON "content_sections" USING btree ("created_at");
  CREATE INDEX "content_sections_rels_order_idx" ON "content_sections_rels" USING btree ("order");
  CREATE INDEX "content_sections_rels_parent_idx" ON "content_sections_rels" USING btree ("parent_id");
  CREATE INDEX "content_sections_rels_path_idx" ON "content_sections_rels" USING btree ("path");
  CREATE INDEX "content_sections_rels_products_id_idx" ON "content_sections_rels" USING btree ("products_id");
  CREATE INDEX "store_settings_shipping_destinations_order_idx" ON "store_settings_shipping_destinations" USING btree ("_order");
  CREATE INDEX "store_settings_shipping_destinations_parent_id_idx" ON "store_settings_shipping_destinations" USING btree ("_parent_id");
  CREATE INDEX "store_settings_payment_methods_order_idx" ON "store_settings_payment_methods" USING btree ("_order");
  CREATE INDEX "store_settings_payment_methods_parent_id_idx" ON "store_settings_payment_methods" USING btree ("_parent_id");
  CREATE INDEX "store_settings_payment_methods_icon_idx" ON "store_settings_payment_methods" USING btree ("icon_id");
  CREATE INDEX "store_settings_trust_highlights_order_idx" ON "store_settings_trust_highlights" USING btree ("_order");
  CREATE INDEX "store_settings_trust_highlights_parent_id_idx" ON "store_settings_trust_highlights" USING btree ("_parent_id");
  CREATE INDEX "store_settings_tracked_events_order_idx" ON "store_settings_tracked_events" USING btree ("order");
  CREATE INDEX "store_settings_tracked_events_parent_idx" ON "store_settings_tracked_events" USING btree ("parent_id");
  ALTER TABLE "categories" ADD CONSTRAINT "categories_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_craftsmanship_image_id_media_id_fk" FOREIGN KEY ("craftsmanship_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_craftsmanship_brand_story_id_stories_id_fk" FOREIGN KEY ("craftsmanship_brand_story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_sections_fk" FOREIGN KEY ("content_sections_id") REFERENCES "public"."content_sections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_hero_image_idx" ON "categories" USING btree ("hero_image_id");
  CREATE INDEX "products_craftsmanship_craftsmanship_image_idx" ON "products" USING btree ("craftsmanship_image_id");
  CREATE INDEX "products_craftsmanship_craftsmanship_brand_story_idx" ON "products" USING btree ("craftsmanship_brand_story_id");
  CREATE INDEX "products_seo_seo_image_idx" ON "products" USING btree ("seo_image_id");
  CREATE INDEX "payload_locked_documents_rels_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("stories_id");
  CREATE INDEX "payload_locked_documents_rels_content_sections_id_idx" ON "payload_locked_documents_rels" USING btree ("content_sections_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_benefits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_details_extra" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stories_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stories_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_sections_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "store_settings_shipping_destinations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "store_settings_payment_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "store_settings_trust_highlights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "store_settings_tracked_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "categories_rels" CASCADE;
  DROP TABLE "products_benefits" CASCADE;
  DROP TABLE "products_details_extra" CASCADE;
  DROP TABLE "stories_images" CASCADE;
  DROP TABLE "stories" CASCADE;
  DROP TABLE "stories_rels" CASCADE;
  DROP TABLE "content_sections" CASCADE;
  DROP TABLE "content_sections_rels" CASCADE;
  DROP TABLE "store_settings_shipping_destinations" CASCADE;
  DROP TABLE "store_settings_payment_methods" CASCADE;
  DROP TABLE "store_settings_trust_highlights" CASCADE;
  DROP TABLE "store_settings_tracked_events" CASCADE;
  ALTER TABLE "categories" DROP CONSTRAINT "categories_hero_image_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_craftsmanship_image_id_media_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_craftsmanship_brand_story_id_stories_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_seo_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_sections_fk";
  
  DROP INDEX "categories_hero_image_idx";
  DROP INDEX "products_craftsmanship_craftsmanship_image_idx";
  DROP INDEX "products_craftsmanship_craftsmanship_brand_story_idx";
  DROP INDEX "products_seo_seo_image_idx";
  DROP INDEX "payload_locked_documents_rels_stories_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_sections_id_idx";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "categories" DROP COLUMN "hero_image_id";
  ALTER TABLE "categories" DROP COLUMN "seo_title";
  ALTER TABLE "categories" DROP COLUMN "seo_description";
  ALTER TABLE "categories" DROP COLUMN "seo_title_en";
  ALTER TABLE "categories" DROP COLUMN "seo_description_en";
  ALTER TABLE "categories" DROP COLUMN "featured";
  ALTER TABLE "categories" DROP COLUMN "seasonal";
  ALTER TABLE "categories" DROP COLUMN "season_label";
  ALTER TABLE "products_gallery" DROP COLUMN "kind";
  ALTER TABLE "products_variants" DROP COLUMN "color_hex";
  ALTER TABLE "products_variants" DROP COLUMN "active";
  ALTER TABLE "products" DROP COLUMN "short_description";
  ALTER TABLE "products" DROP COLUMN "details_materials";
  ALTER TABLE "products" DROP COLUMN "details_width";
  ALTER TABLE "products" DROP COLUMN "details_height";
  ALTER TABLE "products" DROP COLUMN "details_depth";
  ALTER TABLE "products" DROP COLUMN "details_strap_drop";
  ALTER TABLE "products" DROP COLUMN "details_weight";
  ALTER TABLE "products" DROP COLUMN "details_care";
  ALTER TABLE "products" DROP COLUMN "craftsmanship_title";
  ALTER TABLE "products" DROP COLUMN "craftsmanship_story";
  ALTER TABLE "products" DROP COLUMN "craftsmanship_image_id";
  ALTER TABLE "products" DROP COLUMN "craftsmanship_brand_story_id";
  ALTER TABLE "products" DROP COLUMN "craftsmanship_claims_verified";
  ALTER TABLE "products" DROP COLUMN "promotion_sale_price";
  ALTER TABLE "products" DROP COLUMN "promotion_label";
  ALTER TABLE "products" DROP COLUMN "promotion_starts_at";
  ALTER TABLE "products" DROP COLUMN "promotion_ends_at";
  ALTER TABLE "products" DROP COLUMN "low_stock_threshold";
  ALTER TABLE "products" DROP COLUMN "seo_title_en";
  ALTER TABLE "products" DROP COLUMN "seo_description_en";
  ALTER TABLE "products" DROP COLUMN "seo_image_id";
  ALTER TABLE "products" DROP COLUMN "seo_canonical_url";
  ALTER TABLE "products" DROP COLUMN "seo_no_index";
  ALTER TABLE "products" DROP COLUMN "featured";
  ALTER TABLE "reviews" DROP COLUMN "title";
  ALTER TABLE "reviews" DROP COLUMN "reply";
  ALTER TABLE "store_settings" DROP COLUMN "low_stock_threshold";
  ALTER TABLE "store_settings" DROP COLUMN "returns_window_days";
  ALTER TABLE "store_settings" DROP COLUMN "returns_summary";
  ALTER TABLE "store_settings" DROP COLUMN "returns_exchange_conditions";
  ALTER TABLE "store_settings" DROP COLUMN "checkout_guest_checkout";
  ALTER TABLE "store_settings" DROP COLUMN "checkout_ask_email";
  ALTER TABLE "store_settings" DROP COLUMN "checkout_confirmation_message";
  ALTER TABLE "store_settings" DROP COLUMN "checkout_notify_email";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_sections_id";
  DROP TYPE "public"."enum_products_gallery_kind";
  DROP TYPE "public"."enum_products_benefits_icon";
  DROP TYPE "public"."enum_stories_kind";
  DROP TYPE "public"."enum_content_sections_placement";
  DROP TYPE "public"."enum_content_sections_type";
  DROP TYPE "public"."enum_store_settings_payment_methods_key";
  DROP TYPE "public"."enum_store_settings_tracked_events";`)
}
