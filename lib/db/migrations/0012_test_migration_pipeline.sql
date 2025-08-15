CREATE TABLE "migration_pipeline_test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
