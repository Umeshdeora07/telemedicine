ALTER TABLE "doctors" ADD COLUMN "fee_items" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "payment_details" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_document_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "submitted_at" timestamp with time zone;