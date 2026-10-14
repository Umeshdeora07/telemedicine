CREATE TYPE "public"."appointment_status" AS ENUM('pending_payment', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'doctor_no_show', 'patient_no_show', 'expired');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('received', 'under_review', 'plan_sent', 'accepted', 'visa_letter_issued', 'travel_booked', 'arrived', 'in_treatment', 'discharged', 'follow_up', 'closed');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'acknowledged', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."consult_mode" AS ENUM('video', 'audio', 'chat', 'in_clinic');--> statement-breakpoint
CREATE TYPE "public"."consult_type" AS ENUM('first', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('report', 'scan', 'prescription', 'discharge', 'invoice', 'photo', 'recording', 'visa_letter', 'handover_letter', 'treatment_plan', 'registration_certificate', 'degree_certificate', 'government_id', 'selfie', 'signature', 'clinic_photo', 'verification_evidence', 'other');--> statement-breakpoint
CREATE TYPE "public"."family_link_status" AS ENUM('pending_consent', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."licence_status" AS ENUM('pending', 'verified', 'rejected', 'expired', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'sms', 'whatsapp', 'email', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('scheduled', 'sent', 'failed', 'cancelled', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'captured', 'failed', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_state" AS ENUM('held', 'released', 'refunded', 'paid_out');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('patient', 'caregiver', 'doctor', 'clinic_coordinator', 'care_coordinator', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('female', 'male', 'other');--> statement-breakpoint
CREATE TYPE "public"."slot_group" AS ENUM('online', 'in_clinic');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('open', 'held', 'booked', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."tpg_list" AS ENUM('O', 'A', 'B', 'prohibited');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deletion_requested', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "appointment_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"token_hash" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_invites_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"booked_by_user_id" uuid NOT NULL,
	"booked_by_role" text DEFAULT 'patient' NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid,
	"slot_id" uuid,
	"journey_id" uuid,
	"parent_appointment_id" uuid,
	"follow_up_of_id" uuid,
	"mode" "consult_mode" NOT NULL,
	"kind" text DEFAULT 'scheduled' NOT NULL,
	"consult_type" "consult_type" DEFAULT 'first' NOT NULL,
	"status" "appointment_status" DEFAULT 'pending_payment' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"doctor_time_zone" text NOT NULL,
	"patient_time_zone" text NOT NULL,
	"patient_location_country" text NOT NULL,
	"patient_location_region" text,
	"location_confirmed_at" timestamp with time zone,
	"location_source" text,
	"chief_complaint" text,
	"pre_consult" jsonb,
	"triage" jsonb,
	"interpreter_language" text,
	"interpreter_id" uuid,
	"currency" text DEFAULT 'INR' NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"credit_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"payment_mode" text DEFAULT 'online' NOT NULL,
	"coupon_id" uuid,
	"subscription_id" uuid,
	"policy_snapshot" jsonb,
	"queue_joined_at" timestamp with time zone,
	"patient_joined_at" timestamp with time zone,
	"doctor_joined_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"ended_by" text,
	"outcome" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"cancel_reason" text,
	"rescheduled_from_id" uuid,
	"follow_up_chat_until" timestamp with time zone,
	"recording" jsonb,
	"visit_pass_token_hash" text,
	"visit_pass_code" text,
	"checked_in_at" timestamp with time zone,
	"checked_in_by" uuid,
	"doctor_running_late_minutes" integer DEFAULT 0 NOT NULL,
	"identity_confirmed_at" timestamp with time zone,
	"guardian_present" jsonb,
	"explicit_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"specialty_id" uuid,
	"reviewed_by_doctor_id" uuid,
	"reviewed_at" timestamp with time zone,
	"read_minutes" integer DEFAULT 4 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"patient_id" uuid,
	"ip" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"group" "slot_group" NOT NULL,
	"clinic_id" uuid,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"slot_minutes" integer DEFAULT 15 NOT NULL,
	"time_zone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"rule_id" uuid,
	"group" "slot_group" NOT NULL,
	"clinic_id" uuid,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"time_zone" text NOT NULL,
	"status" "slot_status" DEFAULT 'open' NOT NULL,
	"held_until" timestamp with time zone,
	"appointment_id" uuid
);
--> statement-breakpoint
CREATE TABLE "callback_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"preferred_time" text,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to_user_id" uuid,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"doctor_id" uuid,
	"recommended_treatment" text NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"hospital_days" integer NOT NULL,
	"india_days" integer NOT NULL,
	"cost_min_inr_minor" integer NOT NULL,
	"cost_max_inr_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"cost_min_minor" integer NOT NULL,
	"cost_max_minor" integer NOT NULL,
	"fx_rate" double precision NOT NULL,
	"fx_as_of" date NOT NULL,
	"inclusions" text[] DEFAULT '{}'::text[] NOT NULL,
	"exclusions" text[] DEFAULT '{}'::text[] NOT NULL,
	"documents_needed" text[] DEFAULT '{}'::text[] NOT NULL,
	"deposit_minor" integer DEFAULT 0 NOT NULL,
	"valid_until" date NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"status" "case_status",
	"note" text NOT NULL,
	"visible_to_patient" boolean DEFAULT true NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_staff" (
	"clinic_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'Coordinator' NOT NULL,
	CONSTRAINT "clinic_staff_clinic_id_user_id_pk" PRIMARY KEY("clinic_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'clinic' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"address_line" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text DEFAULT 'IN' NOT NULL,
	"postcode" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"email" text,
	"time_zone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"facilities" text[] DEFAULT '{}'::text[] NOT NULL,
	"accreditations" text[] DEFAULT '{}'::text[] NOT NULL,
	"timings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gstin" text,
	"accepts_international" boolean DEFAULT false NOT NULL,
	"international_desk" jsonb,
	"emergency24x7" boolean DEFAULT false NOT NULL,
	"verification_status" "verification_status" DEFAULT 'submitted' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"appointment_id" uuid,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"assigned_to_user_id" uuid,
	"acknowledge_by" timestamp with time zone NOT NULL,
	"resolve_by" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"updates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"specialty_id" uuid NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"symptoms" text[] DEFAULT '{}'::text[] NOT NULL,
	"when_to_see_doctor" text DEFAULT '' NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewed_by_doctor_id" uuid,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "conditions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"patient_id" uuid,
	"appointment_id" uuid,
	"type" text NOT NULL,
	"version" text NOT NULL,
	"granted" boolean NOT NULL,
	"method" text NOT NULL,
	"recorded_by_user_id" uuid,
	"text_hash" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consult_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_doctor_id" uuid,
	"target_clinic_id" uuid,
	"target_specialty_id" uuid,
	"due_by" date,
	"status" text DEFAULT 'open' NOT NULL,
	"booked_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consult_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"complaint" text DEFAULT '' NOT NULL,
	"history" text DEFAULT '' NOT NULL,
	"findings" text DEFAULT '' NOT NULL,
	"diagnosis" text DEFAULT '' NOT NULL,
	"provisional" boolean DEFAULT true NOT NULL,
	"advice" text DEFAULT '' NOT NULL,
	"investigations" text[] DEFAULT '{}'::text[] NOT NULL,
	"warning_signs" text DEFAULT '' NOT NULL,
	"patient_summary" text DEFAULT '' NOT NULL,
	"private_notes" text DEFAULT '' NOT NULL,
	"follow_up_date" date,
	"finalised_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consult_notes_appointmentId_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"local_consults_enabled" boolean DEFAULT false NOT NULL,
	"licence_scope" text DEFAULT 'country' NOT NULL,
	"regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"time_zones" text[] DEFAULT '{}'::text[] NOT NULL,
	"phone_prefix" text DEFAULT '' NOT NULL,
	"emergency" jsonb NOT NULL,
	"allow_pre_travel_video" boolean DEFAULT true NOT NULL,
	"allow_post_return_follow_up" text DEFAULT 'information_only' NOT NULL,
	"consent_text" text,
	"legal_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"max_discount_minor" integer,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"first_consult_only" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"note" text,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_clinic_links" (
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"role" text DEFAULT 'Consultant' NOT NULL,
	"in_clinic_fee_minor" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "doctor_clinic_links_doctor_id_clinic_id_pk" PRIMARY KEY("doctor_id","clinic_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_fees" (
	"doctor_id" uuid NOT NULL,
	"mode" "consult_mode" NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	CONSTRAINT "doctor_fees_doctor_id_mode_currency_pk" PRIMARY KEY("doctor_id","mode","currency")
);
--> statement-breakpoint
CREATE TABLE "doctor_licences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"number" text NOT NULL,
	"issuing_body" text NOT NULL,
	"issued_at" date,
	"expires_at" date,
	"status" "licence_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"verification_reference" text,
	"evidence_document_id" uuid,
	"certificate_document_id" uuid,
	"notes" text,
	"reminders_sent" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"degree" text NOT NULL,
	"institution" text NOT NULL,
	"year" integer NOT NULL,
	"document_id" uuid
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"gender" "sex" NOT NULL,
	"photo_url" text,
	"avatar_seed" integer DEFAULT 0 NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"specialty_id" uuid NOT NULL,
	"sub_specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"conditions_treated" text[] DEFAULT '{}'::text[] NOT NULL,
	"procedures" text[] DEFAULT '{}'::text[] NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"primary_clinic_id" uuid,
	"past_positions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"awards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"memberships" text[] DEFAULT '{}'::text[] NOT NULL,
	"publications" text[] DEFAULT '{}'::text[] NOT NULL,
	"video_intro_url" text,
	"about" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"time_zone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"modes" "consult_mode"[] DEFAULT '{video,audio,chat}'::consult_mode[] NOT NULL,
	"consult_minutes" integer DEFAULT 15 NOT NULL,
	"chat_response_minutes" integer DEFAULT 30 NOT NULL,
	"follow_up_chat_days" integer DEFAULT 3 NOT NULL,
	"accepts_instant" boolean DEFAULT false NOT NULL,
	"available_now_until" timestamp with time zone,
	"offers_second_opinion" boolean DEFAULT false NOT NULL,
	"credit_online_fee_to_clinic" boolean DEFAULT true NOT NULL,
	"signature_document_id" uuid,
	"verification_status" "verification_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"last_verified_by" uuid,
	"reverify_due_at" timestamp with time zone,
	"rejection_reason" text,
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"consult_count" integer DEFAULT 0 NOT NULL,
	"payout_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"doctor_id" uuid,
	"clinic_id" uuid,
	"case_id" uuid,
	"appointment_id" uuid,
	"uploaded_by_user_id" uuid,
	"category" "document_category" NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"report_date" date,
	"source" text DEFAULT 'upload' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dose_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base" text DEFAULT 'INR' NOT NULL,
	"quote" text NOT NULL,
	"rate" double precision NOT NULL,
	"as_of" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_user_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"status" "family_link_status" DEFAULT 'pending_consent' NOT NULL,
	"consent_method" text,
	"consent_at" timestamp with time zone,
	"can_book" boolean DEFAULT true NOT NULL,
	"can_join" boolean DEFAULT true NOT NULL,
	"can_view_records" boolean DEFAULT true NOT NULL,
	"receives_notifications" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "international_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"home_country" text NOT NULL,
	"currency" text NOT NULL,
	"specialty_id" uuid,
	"treatment_interest" text NOT NULL,
	"description" text NOT NULL,
	"preferred_clinic_id" uuid,
	"assigned_clinic_id" uuid,
	"assigned_doctor_id" uuid,
	"coordinator_user_id" uuid,
	"status" "case_status" DEFAULT 'received' NOT NULL,
	"preferred_language" text,
	"travel" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deposit_minor" integer,
	"final_bill_minor" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "international_cases_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "interpreters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"languages" text[] NOT NULL,
	"phone" text,
	"email" text,
	"medical_certified" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescription_item_id" uuid,
	"name" text NOT NULL,
	"dose" text NOT NULL,
	"times" text[] NOT NULL,
	"time_zone" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"refill_alert_date" date,
	"instructions" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generic_name" text NOT NULL,
	"brand_examples" text[] DEFAULT '{}'::text[] NOT NULL,
	"form" text NOT NULL,
	"strengths" text[] DEFAULT '{}'::text[] NOT NULL,
	"drug_class" text NOT NULL,
	"tpg_list" "tpg_list" NOT NULL,
	"schedule" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"appointment_id" uuid,
	"case_id" uuid,
	"patient_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"sender_role" text NOT NULL,
	"sender_name" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"document_id" uuid,
	"kind" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"to" text,
	"channel" "notification_channel" NOT NULL,
	"template" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"appointment_id" uuid,
	"send_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"status" "notification_status" DEFAULT 'scheduled' NOT NULL,
	"error" text,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupeKey_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_user_id_pk" PRIMARY KEY("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"purpose" text DEFAULT 'login' NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"partner" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"prescription_id" uuid,
	"appointment_id" uuid,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"address" text,
	"status" text DEFAULT 'placed' NOT NULL,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"dob" date,
	"sex" "sex",
	"phone" text,
	"email" text,
	"country" text DEFAULT 'IN' NOT NULL,
	"city" text,
	"blood_group" text,
	"height_cm" integer,
	"weight_kg" numeric(5, 1),
	"allergies" text[] DEFAULT '{}'::text[] NOT NULL,
	"conditions" text[] DEFAULT '{}'::text[] NOT NULL,
	"current_medicines" text[] DEFAULT '{}'::text[] NOT NULL,
	"emergency_contact" jsonb,
	"preferred_language" text,
	"abha_address" text,
	"abha_linked_at" timestamp with time zone,
	"emergency_card_token" text,
	"emergency_card_enabled" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"patient_id" uuid,
	"appointment_id" uuid,
	"case_id" uuid,
	"subscription_id" uuid,
	"second_opinion_id" uuid,
	"purpose" text NOT NULL,
	"gateway" text NOT NULL,
	"gateway_order_id" text,
	"gateway_payment_id" text,
	"method" text,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"tax_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fx_rate" double precision,
	"fx_as_of" date,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"payout_state" "payout_state" DEFAULT 'held' NOT NULL,
	"refunded_minor" integer DEFAULT 0 NOT NULL,
	"invoice_number" text,
	"invoice_issued_at" timestamp with time zone,
	"billing" jsonb,
	"captured_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_invoiceNumber_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"gross_minor" integer NOT NULL,
	"commission_minor" integer NOT NULL,
	"tds_minor" integer DEFAULT 0 NOT NULL,
	"net_minor" integer NOT NULL,
	"consults" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"paid_at" timestamp with time zone,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"condition" text,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"consults_per_month" integer DEFAULT 0 NOT NULL,
	"members_allowed" integer DEFAULT 1 NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"reading_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"medicine_id" uuid,
	"name" text NOT NULL,
	"form" text DEFAULT 'tablet' NOT NULL,
	"strength" text DEFAULT '' NOT NULL,
	"dose" text NOT NULL,
	"frequency" text NOT NULL,
	"timing" text DEFAULT 'after_food' NOT NULL,
	"duration_days" integer NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"tpg_list" "tpg_list" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"consult_mode" "consult_mode" NOT NULL,
	"consult_type" "consult_type" NOT NULL,
	"diagnosis" text NOT NULL,
	"provisional" boolean DEFAULT true NOT NULL,
	"advice" text DEFAULT '' NOT NULL,
	"investigations" text[] DEFAULT '{}'::text[] NOT NULL,
	"follow_up_date" date,
	"snapshot" jsonb NOT NULL,
	"signature" text NOT NULL,
	"payload_hash" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"cancelled_reason" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verify_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "prescriptions_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"endpoint" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" double precision NOT NULL,
	"value2" double precision,
	"unit" text NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"note" text,
	"recorded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"appointment_id" uuid,
	"granted_by_user_id" uuid NOT NULL,
	"scope" text DEFAULT 'history' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"reason" text NOT NULL,
	"initiated_by" text NOT NULL,
	"initiated_by_user_id" uuid,
	"status" text DEFAULT 'processed' NOT NULL,
	"gateway_refund_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_display_name" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"doctor_reply" text,
	"replied_at" timestamp with time zone,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_appointmentId_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "room_participants" (
	"peer_id" text PRIMARY KEY NOT NULL,
	"appointment_id" uuid NOT NULL,
	"user_id" uuid,
	"invite_id" uuid,
	"role" text NOT NULL,
	"display_name" text NOT NULL,
	"media" jsonb DEFAULT '{"audio":true,"video":true}'::jsonb NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_doctors" (
	"user_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_doctors_user_id_doctor_id_pk" PRIMARY KEY("user_id","doctor_id")
);
--> statement-breakpoint
CREATE TABLE "second_opinions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	"doctor_id" uuid,
	"patient_location_country" text NOT NULL,
	"patient_location_region" text,
	"question" text NOT NULL,
	"history" text DEFAULT '' NOT NULL,
	"document_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"due_at" timestamp with time zone,
	"opinion" text,
	"recommendations" text,
	"answered_at" timestamp with time zone,
	"currency" text DEFAULT 'INR' NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "second_opinions_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"contained_at" timestamp with time zone,
	"affected_users" integer DEFAULT 0 NOT NULL,
	"reported_to_board_at" timestamp with time zone,
	"users_notified_at" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"mfa_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"document_ids" uuid[] NOT NULL,
	"include_summary" boolean DEFAULT false NOT NULL,
	"recipient_note" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_access_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"appointment_id" uuid NOT NULL,
	"from_peer" text NOT NULL,
	"to_peer" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_hi" text,
	"icon" text DEFAULT 'stethoscope' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"symptoms" text[] DEFAULT '{}'::text[] NOT NULL,
	"treats" text[] DEFAULT '{}'::text[] NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starting_fee_minor" integer DEFAULT 0 NOT NULL,
	"reviewed_by_doctor_id" uuid,
	"reviewed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "specialties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"patient_ids" uuid[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"consults_used" integer DEFAULT 0 NOT NULL,
	"care_doctor_id" uuid,
	"next_check_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" DEFAULT 'patient' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text,
	"phone" text,
	"country_code" text DEFAULT 'IN' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"time_zone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"mfa_secret_enc" text,
	"mfa_enabled_at" timestamp with time zone,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visa_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"letter_number" text NOT NULL,
	"patient_name" text NOT NULL,
	"passport_number_enc" text NOT NULL,
	"nationality" text NOT NULL,
	"attendants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"treatment" text NOT NULL,
	"expected_admission" date,
	"expected_days" integer,
	"document_id" uuid,
	"issued_by_user_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visa_letters_letterNumber_unique" UNIQUE("letter_number")
);
--> statement-breakpoint
ALTER TABLE "appointment_invites" ADD CONSTRAINT "appointment_invites_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_booked_by_user_id_users_id_fk" FOREIGN KEY ("booked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_journey_id_care_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."care_journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_journeys" ADD CONSTRAINT "care_journeys_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_estimates" ADD CONSTRAINT "case_estimates_case_id_international_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."international_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_international_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."international_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consult_actions" ADD CONSTRAINT "consult_actions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consult_notes" ADD CONSTRAINT "consult_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinic_links" ADD CONSTRAINT "doctor_clinic_links_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinic_links" ADD CONSTRAINT "doctor_clinic_links_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_fees" ADD CONSTRAINT "doctor_fees_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_licences" ADD CONSTRAINT "doctor_licences_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_qualifications" ADD CONSTRAINT "doctor_qualifications_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_primary_clinic_id_clinics_id_fk" FOREIGN KEY ("primary_clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_logs" ADD CONSTRAINT "dose_logs_reminder_id_medicine_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."medicine_reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_caregiver_user_id_users_id_fk" FOREIGN KEY ("caregiver_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_cases" ADD CONSTRAINT "international_cases_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "international_cases" ADD CONSTRAINT "international_cases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_reminders" ADD CONSTRAINT "medicine_reminders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_access_grants" ADD CONSTRAINT "record_access_grants_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_access_grants" ADD CONSTRAINT "record_access_grants_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_doctors" ADD CONSTRAINT "saved_doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_doctors" ADD CONSTRAINT "saved_doctors_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "second_opinions" ADD CONSTRAINT "second_opinions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visa_letters" ADD CONSTRAINT "visa_letters_case_id_international_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."international_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appt_patient_idx" ON "appointments" USING btree ("patient_id","start_at");--> statement-breakpoint
CREATE INDEX "appt_doctor_idx" ON "appointments" USING btree ("doctor_id","start_at");--> statement-breakpoint
CREATE INDEX "appt_status_idx" ON "appointments" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "appt_clinic_idx" ON "appointments" USING btree ("clinic_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appt_doctor_start_active_uq" ON "appointments" USING btree ("doctor_id","start_at") WHERE "appointments"."status" in ('pending_payment','confirmed','checked_in','in_progress') and "appointments"."kind" = 'scheduled';--> statement-breakpoint
CREATE INDEX "audit_patient_idx" ON "audit_logs" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slots_doctor_start_uq" ON "availability_slots" USING btree ("doctor_id","group","start_at");--> statement-breakpoint
CREATE INDEX "slots_lookup_idx" ON "availability_slots" USING btree ("doctor_id","status","start_at");--> statement-breakpoint
CREATE INDEX "case_events_idx" ON "case_events" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "complaints_status_idx" ON "complaints" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id","type","created_at");--> statement-breakpoint
CREATE INDEX "actions_patient_idx" ON "consult_actions" USING btree ("patient_id","status");--> statement-breakpoint
CREATE INDEX "licences_doctor_idx" ON "doctor_licences" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "licences_location_idx" ON "doctor_licences" USING btree ("country","region");--> statement-breakpoint
CREATE INDEX "doctors_specialty_idx" ON "doctors" USING btree ("specialty_id");--> statement-breakpoint
CREATE INDEX "doctors_status_idx" ON "doctors" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "documents_patient_idx" ON "documents" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_appt_idx" ON "documents" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "documents_case_idx" ON "documents" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dose_log_uq" ON "dose_logs" USING btree ("reminder_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "fx_quote_idx" ON "exchange_rates" USING btree ("quote","as_of");--> statement-breakpoint
CREATE UNIQUE INDEX "family_link_uq" ON "family_links" USING btree ("caregiver_user_id","patient_id");--> statement-breakpoint
CREATE INDEX "cases_clinic_idx" ON "international_cases" USING btree ("assigned_clinic_id","status");--> statement-breakpoint
CREATE INDEX "medicines_name_idx" ON "medicines" USING btree ("generic_name");--> statement-breakpoint
CREATE INDEX "messages_appt_idx" ON "messages" USING btree ("appointment_id","id");--> statement-breakpoint
CREATE INDEX "messages_case_idx" ON "messages" USING btree ("case_id","id");--> statement-breakpoint
CREATE INDEX "notifications_due_idx" ON "notifications" USING btree ("status","send_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_identifier_idx" ON "otp_codes" USING btree ("identifier","created_at");--> statement-breakpoint
CREATE INDEX "patients_user_idx" ON "patients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "patients_owner_idx" ON "patients" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "payments_appt_idx" ON "payments" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "readings_patient_idx" ON "readings" USING btree ("patient_id","type","taken_at");--> statement-breakpoint
CREATE INDEX "reviews_doctor_idx" ON "reviews" USING btree ("doctor_id","created_at");--> statement-breakpoint
CREATE INDEX "room_appt_idx" ON "room_participants" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "signals_to_idx" ON "signals" USING btree ("to_peer","id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree (lower("email")) WHERE "users"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone") WHERE "users"."phone" is not null;