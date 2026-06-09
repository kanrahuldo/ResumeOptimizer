CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_owner" text,
	"github_repo" text,
	"github_token" text,
	"openai_api_key" text,
	"openai_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
