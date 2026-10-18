ALTER TABLE "sessions" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_logins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Until now a phone number could only come from a code sent to it, and an
-- email address without a phone number from an email code or Google/Apple.
UPDATE "users" SET "phone_verified_at" = "created_at" WHERE "phone" IS NOT NULL;--> statement-breakpoint
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email" IS NOT NULL AND "phone" IS NULL;
