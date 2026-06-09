ALTER TABLE "openai_configs" ADD COLUMN "provider" text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "openai_configs" ADD COLUMN "base_url" text;