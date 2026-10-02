CREATE TABLE "ad_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_key" varchar(50) NOT NULL,
	"provider_name" varchar(100),
	"ad_code" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_settings_slot_key_check" CHECK ("ad_settings"."slot_key" in ('header', 'in_content', 'sidebar', 'footer'))
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"admin_email_hash" varchar(64) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(100),
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"platform_slug" varchar(50) NOT NULL,
	"base_url" text NOT NULL,
	"api_key_encrypted" text,
	"priority" integer DEFAULT 1 NOT NULL,
	"daily_limit" integer DEFAULT 1000 NOT NULL,
	"daily_used" integer DEFAULT 0 NOT NULL,
	"daily_reset_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(255) NOT NULL,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_url_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"pattern_type" varchar(20) NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_url_patterns_pattern_type_check" CHECK ("blocked_url_patterns"."pattern_type" in ('regex', 'glob', 'exact'))
);
--> statement-breakpoint
CREATE TABLE "rate_limit_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"platform_slug" varchar(50),
	"max_requests" integer NOT NULL,
	"window_seconds" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_rules_scope_check" CHECK ("rate_limit_rules"."scope" in ('global', 'per_ip', 'per_platform'))
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar(36) NOT NULL,
	"platform_slug" varchar(50),
	"provider_slug" varchar(50),
	"url_hash" varchar(64) NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"user_agent_hash" varchar(64),
	"status" varchar(20) NOT NULL,
	"error_code" varchar(50),
	"response_time_ms" integer,
	"country_code" varchar(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_logs_status_check" CHECK ("request_logs"."status" in ('success', 'failed', 'blocked', 'rate_limited', 'maintenance'))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"value_type" varchar(20) NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin" uuid,
	CONSTRAINT "site_settings_value_type_check" CHECK ("site_settings"."value_type" in ('string', 'boolean', 'number', 'json'))
);
--> statement-breakpoint
CREATE TABLE "social_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"base_domains" jsonb NOT NULL,
	"allowed_url_patterns" jsonb,
	"blocked_url_patterns" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"icon_url" text,
	"description" text,
	"max_requests_per_minute" integer DEFAULT 10 NOT NULL,
	"status" varchar(20) DEFAULT 'inactive' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_platforms_slug_unique" UNIQUE("slug"),
	CONSTRAINT "social_platforms_status_check" CHECK ("social_platforms"."status" in ('active', 'inactive', 'maintenance'))
);
--> statement-breakpoint
CREATE TABLE "system_health_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"latency_ms" integer,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_health_logs_status_check" CHECK ("system_health_logs"."status" in ('healthy', 'degraded', 'down'))
);
--> statement-breakpoint
ALTER TABLE "api_providers" ADD CONSTRAINT "api_providers_platform_slug_social_platforms_slug_fk" FOREIGN KEY ("platform_slug") REFERENCES "public"."social_platforms"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_settings_slot_key_unique_idx" ON "ad_settings" USING btree ("slot_key");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_user_id_created_at_idx" ON "admin_audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_resource_type_created_at_idx" ON "admin_audit_logs" USING btree ("resource_type","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "api_providers_platform_active_priority_idx" ON "api_providers" USING btree ("platform_slug","is_active","priority");--> statement-breakpoint
CREATE INDEX "api_providers_daily_reset_at_idx" ON "api_providers" USING btree ("daily_reset_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_providers_slug_platform_unique_idx" ON "api_providers" USING btree ("slug","platform_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_domains_domain_unique_idx" ON "blocked_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "blocked_url_patterns_is_active_idx" ON "blocked_url_patterns" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "rate_limit_rules_scope_idx" ON "rate_limit_rules" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "rate_limit_rules_platform_slug_idx" ON "rate_limit_rules" USING btree ("platform_slug");--> statement-breakpoint
CREATE INDEX "rate_limit_rules_is_active_idx" ON "rate_limit_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "request_logs_ip_hash_created_at_idx" ON "request_logs" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_platform_slug_created_at_idx" ON "request_logs" USING btree ("platform_slug","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_status_created_at_idx" ON "request_logs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_created_at_desc_idx" ON "request_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_key_unique_idx" ON "site_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "site_settings_is_public_idx" ON "site_settings" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "social_platforms_is_active_idx" ON "social_platforms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "social_platforms_status_idx" ON "social_platforms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_health_logs_service_created_at_idx" ON "system_health_logs" USING btree ("service","created_at");--> statement-breakpoint
CREATE INDEX "system_health_logs_status_created_at_idx" ON "system_health_logs" USING btree ("status","created_at");