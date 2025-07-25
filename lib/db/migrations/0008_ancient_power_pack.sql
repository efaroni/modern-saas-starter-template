ALTER TABLE "users" ADD COLUMN "email_preferences" jsonb DEFAULT '{"marketing":true,"productUpdates":true,"securityAlerts":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "unsubscribe_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_unsubscribe_token_unique" UNIQUE("unsubscribe_token");