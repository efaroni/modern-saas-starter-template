ALTER TABLE "api_key_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "api_key_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "api_keys" RENAME TO "user_api_keys";--> statement-breakpoint
ALTER TABLE "user_api_keys" RENAME COLUMN "name" TO "provider";--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "public_key" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "private_key_encrypted" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "service_type";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "key_type";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "key";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "last_four";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "user_api_keys" DROP COLUMN "is_owner_key";--> statement-breakpoint
DROP TYPE "public"."key_type";--> statement-breakpoint
DROP TYPE "public"."service_type";