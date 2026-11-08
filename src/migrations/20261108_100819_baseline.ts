import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('cs');
  CREATE TYPE "public"."enum_properties_features" AS ENUM('balkon', 'lodzie', 'terasa', 'sklep', 'garaz', 'parkovani', 'vytah', 'zahrada', 'bazen', 'krb', 'klimatizace', 'bezbarierovy', 'vybaveno', 'castecne-vybaveno', 'nevybaveno', 'internet', 'mhd-v-dosahu');
  CREATE TYPE "public"."enum_properties_transaction_type" AS ENUM('prodej', 'pronajem', 'drazba');
  CREATE TYPE "public"."enum_properties_property_type" AS ENUM('byt', 'dum', 'pozemek', 'komercni', 'garaz', 'chata', 'ostatni');
  CREATE TYPE "public"."enum_properties_disposition" AS ENUM('garsoniera', '1-kk', '1-1', '2-kk', '2-1', '3-kk', '3-1', '4-kk', '4-1', '5-kk', '5-1', '6-a-vice', 'atypicky');
  CREATE TYPE "public"."enum_properties_ownership" AS ENUM('osobni', 'druzstevni', 'statni');
  CREATE TYPE "public"."enum_properties_building_type" AS ENUM('cihla', 'panel', 'skeletova', 'drevostavba', 'montovana', 'smisena', 'ostatni');
  CREATE TYPE "public"."enum_properties_condition" AS ENUM('novostavba', 'velmi-dobry', 'dobry', 'po-rekonstrukci', 'pred-rekonstrukci', 'spatny', 'k-demolici', 've-vystavbe', 'projekt');
  CREATE TYPE "public"."enum_properties_heating" AS ENUM('ustredni-dalkove', 'ustredni-plynove', 'ustredni-elektricke', 'lokalni-plynove', 'tepelne-cerpadlo', 'kotel-tuha-paliva', 'jine');
  CREATE TYPE "public"."enum_properties_penb_class" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'EXEMPT', 'PENDING');
  CREATE TYPE "public"."enum_properties_price_period" AS ENUM('mesic', 'rok');
  CREATE TYPE "public"."enum_properties_address_region" AS ENUM('praha', 'stredocesky', 'jihocesky', 'plzensky', 'karlovarsky', 'ustecky', 'liberecky', 'kralovehradecky', 'pardubicky', 'vysocina', 'jihomoravsky', 'olomoucky', 'zlinsky', 'moravskoslezsky');
  CREATE TYPE "public"."enum_properties_status" AS ENUM('draft', 'active', 'reserved', 'sold', 'rented');
  CREATE TYPE "public"."enum__properties_v_version_features" AS ENUM('balkon', 'lodzie', 'terasa', 'sklep', 'garaz', 'parkovani', 'vytah', 'zahrada', 'bazen', 'krb', 'klimatizace', 'bezbarierovy', 'vybaveno', 'castecne-vybaveno', 'nevybaveno', 'internet', 'mhd-v-dosahu');
  CREATE TYPE "public"."enum__properties_v_version_transaction_type" AS ENUM('prodej', 'pronajem', 'drazba');
  CREATE TYPE "public"."enum__properties_v_version_property_type" AS ENUM('byt', 'dum', 'pozemek', 'komercni', 'garaz', 'chata', 'ostatni');
  CREATE TYPE "public"."enum__properties_v_version_disposition" AS ENUM('garsoniera', '1-kk', '1-1', '2-kk', '2-1', '3-kk', '3-1', '4-kk', '4-1', '5-kk', '5-1', '6-a-vice', 'atypicky');
  CREATE TYPE "public"."enum__properties_v_version_ownership" AS ENUM('osobni', 'druzstevni', 'statni');
  CREATE TYPE "public"."enum__properties_v_version_building_type" AS ENUM('cihla', 'panel', 'skeletova', 'drevostavba', 'montovana', 'smisena', 'ostatni');
  CREATE TYPE "public"."enum__properties_v_version_condition" AS ENUM('novostavba', 'velmi-dobry', 'dobry', 'po-rekonstrukci', 'pred-rekonstrukci', 'spatny', 'k-demolici', 've-vystavbe', 'projekt');
  CREATE TYPE "public"."enum__properties_v_version_heating" AS ENUM('ustredni-dalkove', 'ustredni-plynove', 'ustredni-elektricke', 'lokalni-plynove', 'tepelne-cerpadlo', 'kotel-tuha-paliva', 'jine');
  CREATE TYPE "public"."enum__properties_v_version_penb_class" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'EXEMPT', 'PENDING');
  CREATE TYPE "public"."enum__properties_v_version_price_period" AS ENUM('mesic', 'rok');
  CREATE TYPE "public"."enum__properties_v_version_address_region" AS ENUM('praha', 'stredocesky', 'jihocesky', 'plzensky', 'karlovarsky', 'ustecky', 'liberecky', 'kralovehradecky', 'pardubicky', 'vysocina', 'jihomoravsky', 'olomoucky', 'zlinsky', 'moravskoslezsky');
  CREATE TYPE "public"."enum__properties_v_version_status" AS ENUM('draft', 'active', 'reserved', 'sold', 'rented');
  CREATE TYPE "public"."enum_posts_category" AS ENUM('trh', 'rady', 'financovani', 'pravo', 'novinky');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_category" AS ENUM('trh', 'rady', 'financovani', 'pravo', 'novinky');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('cs');
  CREATE TYPE "public"."enum_services_icon" AS ENUM('home', 'key', 'chart', 'calculator', 'document', 'shield', 'handshake', 'camera');
  CREATE TYPE "public"."enum_enquiries_status" AS ENUM('new', 'contacted', 'meeting', 'closed', 'spam');
  CREATE TYPE "public"."enum_tenants_provisioning_log_status" AS ENUM('ok', 'failed', 'skipped');
  CREATE TYPE "public"."enum_tenants_status" AS ENUM('provisioning', 'awaiting-dns', 'live', 'suspended', 'cancelled');
  CREATE TYPE "public"."enum_tenants_theme_name" AS ENUM('realvista');
  CREATE TYPE "public"."enum_tenants_theme_variant" AS ENUM('indigo', 'crimson', 'clay', 'mono');
  CREATE TYPE "public"."enum_tenants_ring" AS ENUM('canary', 'stable', 'frozen');
  CREATE TYPE "public"."enum_users_tenants_role" AS ENUM('owner', 'editor');
  CREATE TYPE "public"."enum_users_platform_role" AS ENUM('platform-admin', 'client');
  CREATE TABLE "properties_features" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_properties_features",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "properties_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "properties_gallery_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "properties" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"transaction_type" "enum_properties_transaction_type" NOT NULL,
  	"property_type" "enum_properties_property_type" NOT NULL,
  	"disposition" "enum_properties_disposition",
  	"usable_area" numeric,
  	"floor_area" numeric,
  	"land_area" numeric,
  	"floor" numeric,
  	"total_floors" numeric,
  	"year_built" numeric,
  	"ownership" "enum_properties_ownership",
  	"building_type" "enum_properties_building_type",
  	"condition" "enum_properties_condition",
  	"heating" "enum_properties_heating",
  	"penb_class" "enum_properties_penb_class",
  	"penb_exemption_reason" varchar,
  	"penb_energy_kwh_m2_year" numeric,
  	"penb_document_id" integer,
  	"price_amount" numeric,
  	"price_on_request" boolean,
  	"price_period" "enum_properties_price_period" DEFAULT 'mesic',
  	"price_utilities_amount" numeric,
  	"price_deposit" numeric,
  	"price_utilities_included" boolean,
  	"price_commission_included" boolean,
  	"address_street" varchar,
  	"address_city" varchar NOT NULL,
  	"address_city_part" varchar,
  	"address_zip" varchar,
  	"address_region" "enum_properties_address_region",
  	"address_hide_exact_address" boolean,
  	"address_lat" numeric,
  	"address_lng" numeric,
  	"floor_plan_id" integer,
  	"virtual_tour" varchar,
  	"video_url" varchar,
  	"status" "enum_properties_status" DEFAULT 'draft' NOT NULL,
  	"featured" boolean,
  	"slug" varchar,
  	"available_from" timestamp(3) with time zone,
  	"reference_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "properties_locales" (
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"price_note" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_properties_v_version_features" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__properties_v_version_features",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_properties_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_properties_v_version_gallery_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_properties_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_transaction_type" "enum__properties_v_version_transaction_type" NOT NULL,
  	"version_property_type" "enum__properties_v_version_property_type" NOT NULL,
  	"version_disposition" "enum__properties_v_version_disposition",
  	"version_usable_area" numeric,
  	"version_floor_area" numeric,
  	"version_land_area" numeric,
  	"version_floor" numeric,
  	"version_total_floors" numeric,
  	"version_year_built" numeric,
  	"version_ownership" "enum__properties_v_version_ownership",
  	"version_building_type" "enum__properties_v_version_building_type",
  	"version_condition" "enum__properties_v_version_condition",
  	"version_heating" "enum__properties_v_version_heating",
  	"version_penb_class" "enum__properties_v_version_penb_class",
  	"version_penb_exemption_reason" varchar,
  	"version_penb_energy_kwh_m2_year" numeric,
  	"version_penb_document_id" integer,
  	"version_price_amount" numeric,
  	"version_price_on_request" boolean,
  	"version_price_period" "enum__properties_v_version_price_period" DEFAULT 'mesic',
  	"version_price_utilities_amount" numeric,
  	"version_price_deposit" numeric,
  	"version_price_utilities_included" boolean,
  	"version_price_commission_included" boolean,
  	"version_address_street" varchar,
  	"version_address_city" varchar NOT NULL,
  	"version_address_city_part" varchar,
  	"version_address_zip" varchar,
  	"version_address_region" "enum__properties_v_version_address_region",
  	"version_address_hide_exact_address" boolean,
  	"version_address_lat" numeric,
  	"version_address_lng" numeric,
  	"version_floor_plan_id" integer,
  	"version_virtual_tour" varchar,
  	"version_video_url" varchar,
  	"version_status" "enum__properties_v_version_status" DEFAULT 'draft' NOT NULL,
  	"version_featured" boolean,
  	"version_slug" varchar,
  	"version_available_from" timestamp(3) with time zone,
  	"version_reference_id" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_properties_v_locales" (
  	"version_title" varchar NOT NULL,
  	"version_description" jsonb,
  	"version_price_note" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"cover_image_id" integer,
  	"category" "enum_posts_category",
  	"published_at" timestamp(3) with time zone,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_cover_image_id" integer,
  	"version_category" "enum__posts_v_version_category",
  	"version_published_at" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__posts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"icon" "enum_services_icon",
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "services_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"message" varchar,
  	"property_id" integer,
  	"consent_given" boolean,
  	"consent_text" varchar,
  	"consent_at" timestamp(3) with time zone,
  	"source" varchar,
  	"status" "enum_enquiries_status" DEFAULT 'new',
  	"internal_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"prefix" varchar DEFAULT '',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_full_url" varchar,
  	"sizes_full_width" numeric,
  	"sizes_full_height" numeric,
  	"sizes_full_mime_type" varchar,
  	"sizes_full_filesize" numeric,
  	"sizes_full_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "site_settings_agent_certifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings_agent_certifications_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "site_settings_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"site_name" varchar NOT NULL,
  	"hero_cta_href" varchar,
  	"hero_background_image_id" integer,
  	"agent_name" varchar NOT NULL,
  	"agent_photo_id" integer,
  	"agent_phone" varchar,
  	"agent_email" varchar,
  	"agent_licence_number" varchar,
  	"about_image_id" integer,
  	"contact_company_name" varchar,
  	"contact_ico" varchar,
  	"contact_dic" varchar,
  	"contact_address" varchar,
  	"contact_phone" varchar,
  	"contact_email" varchar,
  	"contact_map_embed" varchar,
  	"contact_social_facebook" varchar,
  	"contact_social_instagram" varchar,
  	"contact_social_linkedin" varchar,
  	"contact_social_youtube" varchar,
  	"branding_logo_id" integer,
  	"branding_logo_inverse_id" integer,
  	"branding_favicon_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_locales" (
  	"hero_headline" varchar,
  	"hero_subheadline" varchar,
  	"hero_cta_label" varchar,
  	"agent_job_title" varchar,
  	"agent_bio" jsonb,
  	"about_heading" varchar,
  	"about_body" jsonb,
  	"contact_office_hours" varchar,
  	"legal_privacy_policy" jsonb,
  	"legal_cookie_notice" jsonb,
  	"legal_gdpr_consent_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tenants_provisioning_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step" varchar,
  	"status" "enum_tenants_provisioning_log_status",
  	"at" timestamp(3) with time zone,
  	"detail" varchar
  );
  
  CREATE TABLE "tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_tenants_status" DEFAULT 'provisioning' NOT NULL,
  	"theme_name" "enum_tenants_theme_name" DEFAULT 'realvista' NOT NULL,
  	"theme_variant" "enum_tenants_theme_variant" DEFAULT 'indigo' NOT NULL,
  	"hosting_domain" varchar,
  	"hosting_platform_subdomain" varchar,
  	"hosting_site_url" varchar,
  	"hosting_github_repo" varchar,
  	"hosting_vercel_project_id" varchar,
  	"revalidate_secret" varchar,
  	"ring" "enum_tenants_ring" DEFAULT 'stable',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_tenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"role" "enum_users_tenants_role" DEFAULT 'owner' NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"platform_role" "enum_users_platform_role" DEFAULT 'client' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"properties_id" integer,
  	"posts_id" integer,
  	"services_id" integer,
  	"enquiries_id" integer,
  	"media_id" integer,
  	"site_settings_id" integer,
  	"tenants_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "properties_features" ADD CONSTRAINT "properties_features_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_gallery" ADD CONSTRAINT "properties_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_gallery" ADD CONSTRAINT "properties_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties_gallery_locales" ADD CONSTRAINT "properties_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_penb_document_id_media_id_fk" FOREIGN KEY ("penb_document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties" ADD CONSTRAINT "properties_floor_plan_id_media_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "properties_locales" ADD CONSTRAINT "properties_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_version_features" ADD CONSTRAINT "_properties_v_version_features_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_version_gallery" ADD CONSTRAINT "_properties_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v_version_gallery" ADD CONSTRAINT "_properties_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v_version_gallery_locales" ADD CONSTRAINT "_properties_v_version_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_properties_v_version_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_parent_id_properties_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_penb_document_id_media_id_fk" FOREIGN KEY ("version_penb_document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v" ADD CONSTRAINT "_properties_v_version_floor_plan_id_media_id_fk" FOREIGN KEY ("version_floor_plan_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_properties_v_locales" ADD CONSTRAINT "_properties_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_properties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_agent_certifications" ADD CONSTRAINT "site_settings_agent_certifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_agent_certifications_locales" ADD CONSTRAINT "site_settings_agent_certifications_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_agent_certifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_stats" ADD CONSTRAINT "site_settings_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_stats_locales" ADD CONSTRAINT "site_settings_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_background_image_id_media_id_fk" FOREIGN KEY ("hero_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_agent_photo_id_media_id_fk" FOREIGN KEY ("agent_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_about_image_id_media_id_fk" FOREIGN KEY ("about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_logo_id_media_id_fk" FOREIGN KEY ("branding_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_logo_inverse_id_media_id_fk" FOREIGN KEY ("branding_logo_inverse_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_branding_favicon_id_media_id_fk" FOREIGN KEY ("branding_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tenants_provisioning_log" ADD CONSTRAINT "tenants_provisioning_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_properties_fk" FOREIGN KEY ("properties_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "properties_features_order_idx" ON "properties_features" USING btree ("order");
  CREATE INDEX "properties_features_parent_idx" ON "properties_features" USING btree ("parent_id");
  CREATE INDEX "properties_gallery_order_idx" ON "properties_gallery" USING btree ("_order");
  CREATE INDEX "properties_gallery_parent_id_idx" ON "properties_gallery" USING btree ("_parent_id");
  CREATE INDEX "properties_gallery_image_idx" ON "properties_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "properties_gallery_locales_locale_parent_id_unique" ON "properties_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "properties_tenant_idx" ON "properties" USING btree ("tenant_id");
  CREATE INDEX "properties_penb_penb_document_idx" ON "properties" USING btree ("penb_document_id");
  CREATE INDEX "properties_floor_plan_idx" ON "properties" USING btree ("floor_plan_id");
  CREATE INDEX "properties_slug_idx" ON "properties" USING btree ("slug");
  CREATE INDEX "properties_updated_at_idx" ON "properties" USING btree ("updated_at");
  CREATE INDEX "properties_created_at_idx" ON "properties" USING btree ("created_at");
  CREATE UNIQUE INDEX "properties_locales_locale_parent_id_unique" ON "properties_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_properties_v_version_features_order_idx" ON "_properties_v_version_features" USING btree ("order");
  CREATE INDEX "_properties_v_version_features_parent_idx" ON "_properties_v_version_features" USING btree ("parent_id");
  CREATE INDEX "_properties_v_version_gallery_order_idx" ON "_properties_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_properties_v_version_gallery_parent_id_idx" ON "_properties_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_properties_v_version_gallery_image_idx" ON "_properties_v_version_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "_properties_v_version_gallery_locales_locale_parent_id_uniqu" ON "_properties_v_version_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_properties_v_parent_idx" ON "_properties_v" USING btree ("parent_id");
  CREATE INDEX "_properties_v_version_version_tenant_idx" ON "_properties_v" USING btree ("version_tenant_id");
  CREATE INDEX "_properties_v_version_penb_version_penb_document_idx" ON "_properties_v" USING btree ("version_penb_document_id");
  CREATE INDEX "_properties_v_version_version_floor_plan_idx" ON "_properties_v" USING btree ("version_floor_plan_id");
  CREATE INDEX "_properties_v_version_version_slug_idx" ON "_properties_v" USING btree ("version_slug");
  CREATE INDEX "_properties_v_version_version_updated_at_idx" ON "_properties_v" USING btree ("version_updated_at");
  CREATE INDEX "_properties_v_version_version_created_at_idx" ON "_properties_v" USING btree ("version_created_at");
  CREATE INDEX "_properties_v_created_at_idx" ON "_properties_v" USING btree ("created_at");
  CREATE INDEX "_properties_v_updated_at_idx" ON "_properties_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_properties_v_locales_locale_parent_id_unique" ON "_properties_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_tenant_idx" ON "posts" USING btree ("tenant_id");
  CREATE INDEX "posts_cover_image_idx" ON "posts" USING btree ("cover_image_id");
  CREATE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_tenant_idx" ON "_posts_v" USING btree ("version_tenant_id");
  CREATE INDEX "_posts_v_version_version_cover_image_idx" ON "_posts_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_tenant_idx" ON "services" USING btree ("tenant_id");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "enquiries_tenant_idx" ON "enquiries" USING btree ("tenant_id");
  CREATE INDEX "enquiries_property_idx" ON "enquiries" USING btree ("property_id");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_full_sizes_full_filename_idx" ON "media" USING btree ("sizes_full_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_agent_certifications_order_idx" ON "site_settings_agent_certifications" USING btree ("_order");
  CREATE INDEX "site_settings_agent_certifications_parent_id_idx" ON "site_settings_agent_certifications" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_agent_certifications_locales_locale_parent_id_" ON "site_settings_agent_certifications_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_stats_order_idx" ON "site_settings_stats" USING btree ("_order");
  CREATE INDEX "site_settings_stats_parent_id_idx" ON "site_settings_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_stats_locales_locale_parent_id_unique" ON "site_settings_stats_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "site_settings_tenant_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "site_settings_hero_hero_background_image_idx" ON "site_settings" USING btree ("hero_background_image_id");
  CREATE INDEX "site_settings_agent_agent_photo_idx" ON "site_settings" USING btree ("agent_photo_id");
  CREATE INDEX "site_settings_about_about_image_idx" ON "site_settings" USING btree ("about_image_id");
  CREATE INDEX "site_settings_branding_branding_logo_idx" ON "site_settings" USING btree ("branding_logo_id");
  CREATE INDEX "site_settings_branding_branding_logo_inverse_idx" ON "site_settings" USING btree ("branding_logo_inverse_id");
  CREATE INDEX "site_settings_branding_branding_favicon_idx" ON "site_settings" USING btree ("branding_favicon_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tenants_provisioning_log_order_idx" ON "tenants_provisioning_log" USING btree ("_order");
  CREATE INDEX "tenants_provisioning_log_parent_id_idx" ON "tenants_provisioning_log" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE INDEX "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE INDEX "users_tenants_order_idx" ON "users_tenants" USING btree ("_order");
  CREATE INDEX "users_tenants_parent_id_idx" ON "users_tenants" USING btree ("_parent_id");
  CREATE INDEX "users_tenants_tenant_idx" ON "users_tenants" USING btree ("tenant_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_properties_id_idx" ON "payload_locked_documents_rels" USING btree ("properties_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "properties_features" CASCADE;
  DROP TABLE "properties_gallery" CASCADE;
  DROP TABLE "properties_gallery_locales" CASCADE;
  DROP TABLE "properties" CASCADE;
  DROP TABLE "properties_locales" CASCADE;
  DROP TABLE "_properties_v_version_features" CASCADE;
  DROP TABLE "_properties_v_version_gallery" CASCADE;
  DROP TABLE "_properties_v_version_gallery_locales" CASCADE;
  DROP TABLE "_properties_v" CASCADE;
  DROP TABLE "_properties_v_locales" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "site_settings_agent_certifications" CASCADE;
  DROP TABLE "site_settings_agent_certifications_locales" CASCADE;
  DROP TABLE "site_settings_stats" CASCADE;
  DROP TABLE "site_settings_stats_locales" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "tenants_provisioning_log" CASCADE;
  DROP TABLE "tenants" CASCADE;
  DROP TABLE "users_tenants" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_properties_features";
  DROP TYPE "public"."enum_properties_transaction_type";
  DROP TYPE "public"."enum_properties_property_type";
  DROP TYPE "public"."enum_properties_disposition";
  DROP TYPE "public"."enum_properties_ownership";
  DROP TYPE "public"."enum_properties_building_type";
  DROP TYPE "public"."enum_properties_condition";
  DROP TYPE "public"."enum_properties_heating";
  DROP TYPE "public"."enum_properties_penb_class";
  DROP TYPE "public"."enum_properties_price_period";
  DROP TYPE "public"."enum_properties_address_region";
  DROP TYPE "public"."enum_properties_status";
  DROP TYPE "public"."enum__properties_v_version_features";
  DROP TYPE "public"."enum__properties_v_version_transaction_type";
  DROP TYPE "public"."enum__properties_v_version_property_type";
  DROP TYPE "public"."enum__properties_v_version_disposition";
  DROP TYPE "public"."enum__properties_v_version_ownership";
  DROP TYPE "public"."enum__properties_v_version_building_type";
  DROP TYPE "public"."enum__properties_v_version_condition";
  DROP TYPE "public"."enum__properties_v_version_heating";
  DROP TYPE "public"."enum__properties_v_version_penb_class";
  DROP TYPE "public"."enum__properties_v_version_price_period";
  DROP TYPE "public"."enum__properties_v_version_address_region";
  DROP TYPE "public"."enum__properties_v_version_status";
  DROP TYPE "public"."enum_posts_category";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_category";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum__posts_v_published_locale";
  DROP TYPE "public"."enum_services_icon";
  DROP TYPE "public"."enum_enquiries_status";
  DROP TYPE "public"."enum_tenants_provisioning_log_status";
  DROP TYPE "public"."enum_tenants_status";
  DROP TYPE "public"."enum_tenants_theme_name";
  DROP TYPE "public"."enum_tenants_theme_variant";
  DROP TYPE "public"."enum_tenants_ring";
  DROP TYPE "public"."enum_users_tenants_role";
  DROP TYPE "public"."enum_users_platform_role";`)
}
