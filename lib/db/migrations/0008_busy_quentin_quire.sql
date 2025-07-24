ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_unique";--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "features" DROP NOT NULL;