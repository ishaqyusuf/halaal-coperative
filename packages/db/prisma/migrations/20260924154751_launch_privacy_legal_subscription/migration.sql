/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,submission_key]` on the table `food_purchase_applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,submission_key]` on the table `procurement_requests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,submission_key]` on the table `project_financing_requests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cooperative_code_prefix]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cooperative_access_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "QaDataClassification" AS ENUM ('live', 'qa');

-- CreateEnum
CREATE TYPE "QaPurgeRunStatus" AS ENUM ('queued', 'running', 'completed', 'partially_completed', 'failed', 'blocked');

-- CreateEnum
CREATE TYPE "AuthChallengePurpose" AS ENUM ('member_email_verification', 'member_activation_completion', 'password_recovery');

-- CreateEnum
CREATE TYPE "SubscriptionPlanCode" AS ENUM ('free_beta', 'starter', 'standard', 'growth', 'enterprise');

-- CreateEnum
CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('free_beta', 'trialing', 'active', 'past_due', 'grace', 'cancelled', 'suspended', 'manual', 'enterprise');

-- CreateEnum
CREATE TYPE "TenantSubscriptionSource" AS ENUM ('system_default', 'free_beta', 'manual', 'billing_provider', 'enterprise_contract');

-- CreateEnum
CREATE TYPE "SubscriptionAddonStatus" AS ENUM ('active', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionCheckoutIntentStatus" AS ENUM ('pending', 'ready', 'completed', 'expired', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible', 'refunded');

-- CreateEnum
CREATE TYPE "SubscriptionProviderEventStatus" AS ENUM ('received', 'processing', 'applied', 'ignored', 'failed');

-- CreateEnum
CREATE TYPE "AccountPrivacyRequestStatus" AS ENUM ('submitted', 'verified', 'awaiting_information', 'processing', 'completed', 'rejected', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FoodPurchaseCycleStatus" ADD VALUE 'draft';
ALTER TYPE "FoodPurchaseCycleStatus" ADD VALUE 'intake_closed';
ALTER TYPE "FoodPurchaseCycleStatus" ADD VALUE 'completed';

-- AlterTable
ALTER TABLE "charge_applicability" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "food_purchase_applications" ADD COLUMN     "submission_key" TEXT;

-- AlterTable
ALTER TABLE "member_opening_balances" ADD COLUMN     "active_financing_installment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "active_financing_installments_paid" INTEGER,
ADD COLUMN     "active_financing_original_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "active_financing_repayment_months" INTEGER,
ADD COLUMN     "food_purchase_installment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "food_purchase_installments_paid" INTEGER,
ADD COLUMN     "food_purchase_item_name" TEXT,
ADD COLUMN     "food_purchase_opened_at" DATE,
ADD COLUMN     "food_purchase_original_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "food_purchase_repayment_months" INTEGER,
ADD COLUMN     "procurement_installment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "procurement_installments_paid" INTEGER,
ADD COLUMN     "procurement_item_name" TEXT,
ADD COLUMN     "procurement_opened_at" DATE,
ADD COLUMN     "procurement_original_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "procurement_repayment_months" INTEGER,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "member_share_applications" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "procurement_requests" ADD COLUMN     "submission_key" TEXT;

-- AlterTable
ALTER TABLE "project_financing_requests" ADD COLUMN     "submission_key" TEXT;

-- AlterTable
ALTER TABLE "support_cases" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "city" TEXT,
ADD COLUMN     "cooperative_code_prefix" VARCHAR(5),
ADD COLUMN     "country" TEXT,
ADD COLUMN     "data_classification" "QaDataClassification" NOT NULL DEFAULT 'live',
ADD COLUMN     "qa_marked_at" TIMESTAMPTZ(6),
ADD COLUMN     "qa_purge_started_at" TIMESTAMPTZ(6),
ADD COLUMN     "qa_source_domain" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cooperative_access_code" VARCHAR(96);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "onboarding_request_id" UUID,
    "purpose" "AuthChallengePurpose" NOT NULL,
    "evidence_hash" VARCHAR(64) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_rate_limit_buckets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "operation" VARCHAR(64) NOT NULL,
    "signal_type" VARCHAR(32) NOT NULL,
    "signal_hash" VARCHAR(64) NOT NULL,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_device_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID,
    "token_hash" VARCHAR(64) NOT NULL,
    "device_id_hash" VARCHAR(64) NOT NULL,
    "device_label" VARCHAR(160) NOT NULL,
    "platform" VARCHAR(40) NOT NULL,
    "app_version" VARCHAR(80) NOT NULL,
    "build_variant" VARCHAR(80) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by_user_id" UUID,
    "revocation_reason" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_brought_forward_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "as_of_date" DATE NOT NULL,
    "member_count_snapshot" INTEGER NOT NULL,
    "total_member_savings_amount" DECIMAL(18,2) NOT NULL,
    "total_special_savings_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_share_units" INTEGER NOT NULL,
    "share_unit_amount_snapshot" DECIMAL(18,2) NOT NULL,
    "total_share_capital_amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_brought_forward_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_special_savings_withdrawals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "support_case_id" UUID NOT NULL,
    "ledger_transaction_id" UUID NOT NULL,
    "processed_by_user_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_special_savings_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_user_notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_type" VARCHAR(80) NOT NULL,
    "channel" VARCHAR(24) NOT NULL DEFAULT 'push',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_push_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mobile_device_session_id" UUID NOT NULL,
    "provider" VARCHAR(24) NOT NULL DEFAULT 'expo',
    "provider_token" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "platform" VARCHAR(40) NOT NULL,
    "permission_status" VARCHAR(40) NOT NULL,
    "project_id" VARCHAR(120),
    "status" VARCHAR(24) NOT NULL DEFAULT 'active',
    "failure_code" VARCHAR(80),
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_validated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_push_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_privacy_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "support_case_id" UUID,
    "idempotency_key" UUID NOT NULL,
    "status" "AccountPrivacyRequestStatus" NOT NULL DEFAULT 'submitted',
    "notice_version" VARCHAR(80) NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by_user_id" UUID,
    "verification_evidence" TEXT,
    "access_revoked_at" TIMESTAMPTZ(6),
    "processing_evidence" JSONB,
    "completion_summary" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "account_privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "document_type" VARCHAR(40) NOT NULL,
    "document_version" VARCHAR(80) NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "content_snapshot" JSONB NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "surface" VARCHAR(40) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_tester_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qa_domain" VARCHAR(253) NOT NULL,
    "tester_label" VARCHAR(160) NOT NULL,
    "credential_digest" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "failed_attempt_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "qa_tester_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_client_authorizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credential_id" UUID NOT NULL,
    "qa_domain" VARCHAR(253) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "client_signal_hash" VARCHAR(64) NOT NULL,
    "client_kind" VARCHAR(16) NOT NULL,
    "environment" VARCHAR(24) NOT NULL,
    "contract_version" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "qa_client_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "SubscriptionPlanCode" NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'NGN',
    "monthly_price_min" DECIMAL(18,2),
    "monthly_price_max" DECIMAL(18,2),
    "setup_fee_min" DECIMAL(18,2),
    "setup_fee_max" DECIMAL(18,2),
    "active_member_limit" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "entitlement_definition" JSONB NOT NULL,
    "available_addon_codes" JSONB NOT NULL,
    "addon_definitions" JSONB NOT NULL DEFAULT '[]',
    "pass_through_cost_definitions" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "TenantSubscriptionStatus" NOT NULL,
    "source" "TenantSubscriptionSource" NOT NULL,
    "provider_name" TEXT,
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "trial_starts_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "current_period_starts_at" TIMESTAMPTZ(6),
    "current_period_ends_at" TIMESTAMPTZ(6),
    "grace_ends_at" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "active_member_limit_override" INTEGER,
    "source_state" JSONB,
    "last_provider_event_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscription_addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tenant_subscription_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "SubscriptionAddonStatus" NOT NULL DEFAULT 'active',
    "entitlement_overrides" JSONB,
    "limit_overrides" JSONB,
    "price_amount" DECIMAL(18,2),
    "currency_code" TEXT NOT NULL DEFAULT 'NGN',
    "provider_addon_id" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_subscription_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_checkout_intents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tenant_subscription_id" UUID,
    "requested_plan_code" "SubscriptionPlanCode" NOT NULL,
    "status" "SubscriptionCheckoutIntentStatus" NOT NULL DEFAULT 'pending',
    "provider_name" TEXT,
    "provider_intent_id" TEXT,
    "requested_by_user_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "checkout_url" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "request_state" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_checkout_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tenant_subscription_id" UUID NOT NULL,
    "provider_name" TEXT,
    "provider_invoice_id" TEXT,
    "invoice_number" TEXT,
    "status" "SubscriptionInvoiceStatus" NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'NGN',
    "subtotal_amount" DECIMAL(18,2) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "amount_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "period_starts_at" TIMESTAMPTZ(6),
    "period_ends_at" TIMESTAMPTZ(6),
    "due_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "hosted_invoice_url" TEXT,
    "line_items" JSONB NOT NULL,
    "provider_state" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_provider_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "provider_name" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "SubscriptionProviderEventStatus" NOT NULL DEFAULT 'received',
    "payload_hash" TEXT NOT NULL,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_purge_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by_user_id" UUID NOT NULL,
    "status" "QaPurgeRunStatus" NOT NULL DEFAULT 'queued',
    "active_key" TEXT,
    "deleted_counts" JSONB,
    "error_category" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "qa_purge_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_challenges_tenant_purpose_created_idx" ON "auth_challenges"("tenant_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "auth_challenges_user_purpose_created_idx" ON "auth_challenges"("user_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "auth_challenges_onboarding_purpose_idx" ON "auth_challenges"("onboarding_request_id", "purpose");

-- CreateIndex
CREATE INDEX "auth_challenges_expires_at_idx" ON "auth_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "auth_rate_limit_buckets_tenant_operation_idx" ON "auth_rate_limit_buckets"("tenant_id", "operation", "window_started_at");

-- CreateIndex
CREATE INDEX "auth_rate_limit_buckets_expires_at_idx" ON "auth_rate_limit_buckets"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_rate_limit_buckets_signal_window_key" ON "auth_rate_limit_buckets"("operation", "signal_type", "signal_hash", "window_started_at");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_device_sessions_token_hash_key" ON "mobile_device_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "mobile_device_sessions_tenant_user_state_idx" ON "mobile_device_sessions"("tenant_id", "user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "mobile_device_sessions_membership_state_idx" ON "mobile_device_sessions"("membership_id", "revoked_at");

-- CreateIndex
CREATE INDEX "mobile_device_sessions_device_user_idx" ON "mobile_device_sessions"("device_id_hash", "user_id");

-- CreateIndex
CREATE INDEX "mobile_device_sessions_expires_at_idx" ON "mobile_device_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_brought_forward_snapshots_tenant_id_key" ON "tenant_brought_forward_snapshots"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_special_savings_withdrawals_support_case_id_key" ON "member_special_savings_withdrawals"("support_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_special_savings_withdrawals_ledger_transaction_id_key" ON "member_special_savings_withdrawals"("ledger_transaction_id");

-- CreateIndex
CREATE INDEX "member_special_savings_withdrawals_tenant_member_paid_idx" ON "member_special_savings_withdrawals"("tenant_id", "member_id", "paid_at");

-- CreateIndex
CREATE INDEX "member_special_savings_withdrawals_tenant_paid_idx" ON "member_special_savings_withdrawals"("tenant_id", "paid_at");

-- CreateIndex
CREATE INDEX "mobile_user_notification_preferences_scope_idx" ON "mobile_user_notification_preferences"("tenant_id", "user_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_user_notification_preferences_scope_key" ON "mobile_user_notification_preferences"("tenant_id", "user_id", "notification_type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_push_registrations_mobile_device_session_id_key" ON "mobile_push_registrations"("mobile_device_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_push_registrations_token_hash_key" ON "mobile_push_registrations"("token_hash");

-- CreateIndex
CREATE INDEX "mobile_push_registrations_recipient_state_idx" ON "mobile_push_registrations"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "mobile_push_registrations_provider_state_idx" ON "mobile_push_registrations"("status", "last_validated_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_privacy_requests_support_case_id_key" ON "account_privacy_requests"("support_case_id");

-- CreateIndex
CREATE INDEX "account_privacy_requests_user_requested_idx" ON "account_privacy_requests"("user_id", "requested_at");

-- CreateIndex
CREATE INDEX "account_privacy_requests_status_requested_idx" ON "account_privacy_requests"("status", "requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_privacy_requests_user_idempotency_key" ON "account_privacy_requests"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "legal_acceptances_tenant_accepted_idx" ON "legal_acceptances"("tenant_id", "accepted_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_acceptances_user_document_key" ON "legal_acceptances"("user_id", "document_type", "document_version", "content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "qa_tester_credentials_credential_digest_key" ON "qa_tester_credentials"("credential_digest");

-- CreateIndex
CREATE INDEX "qa_tester_credentials_domain_state_idx" ON "qa_tester_credentials"("qa_domain", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "qa_tester_credentials_creator_idx" ON "qa_tester_credentials"("created_by_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "qa_client_authorizations_token_hash_key" ON "qa_client_authorizations"("token_hash");

-- CreateIndex
CREATE INDEX "qa_client_authorizations_domain_state_idx" ON "qa_client_authorizations"("qa_domain", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "qa_client_authorizations_credential_state_idx" ON "qa_client_authorizations"("credential_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_active_sort_idx" ON "subscription_plans"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_plan_status_idx" ON "tenant_subscriptions"("plan_id", "status");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_period_end_idx" ON "tenant_subscriptions"("current_period_ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_provider_subscription_key" ON "tenant_subscriptions"("provider_name", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "tenant_subscription_addons_tenant_status_idx" ON "tenant_subscription_addons"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscription_addons_subscription_code_key" ON "tenant_subscription_addons"("tenant_subscription_id", "code");

-- CreateIndex
CREATE INDEX "subscription_checkout_intents_tenant_created_idx" ON "subscription_checkout_intents"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_checkout_intents_provider_intent_key" ON "subscription_checkout_intents"("provider_name", "provider_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_checkout_intents_tenant_idempotency_key" ON "subscription_checkout_intents"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "subscription_invoices_tenant_created_idx" ON "subscription_invoices"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_status_idx" ON "subscription_invoices"("tenant_subscription_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_provider_invoice_key" ON "subscription_invoices"("provider_name", "provider_invoice_id");

-- CreateIndex
CREATE INDEX "subscription_provider_events_tenant_occurred_idx" ON "subscription_provider_events"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "subscription_provider_events_status_created_idx" ON "subscription_provider_events"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_provider_events_provider_event_key" ON "subscription_provider_events"("provider_name", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "qa_purge_runs_active_key_key" ON "qa_purge_runs"("active_key");

-- CreateIndex
CREATE INDEX "qa_purge_runs_created_at_idx" ON "qa_purge_runs"("created_at");

-- CreateIndex
CREATE INDEX "qa_purge_runs_status_idx" ON "qa_purge_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "food_purchase_applications_tenant_submission_key" ON "food_purchase_applications"("tenant_id", "submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_requests_tenant_submission_key" ON "procurement_requests"("tenant_id", "submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "project_financing_requests_tenant_submission_key" ON "project_financing_requests"("tenant_id", "submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cooperative_code_prefix_key" ON "tenants"("cooperative_code_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "users_cooperative_access_code_key" ON "users"("cooperative_access_code");

-- RenameForeignKey
ALTER TABLE "collection_source_contribution_batch_rows" RENAME CONSTRAINT "collection_source_contribution_batch_rows_contribution_plan_id_" TO "collection_source_contribution_batch_rows_contribution_pla_fkey";

-- RenameForeignKey
ALTER TABLE "historical_member_share_purchases" RENAME CONSTRAINT "historical_member_share_purchases_posted_share_ledger_entry_id_" TO "historical_member_share_purchases_posted_share_ledger_entr_fkey";

-- RenameForeignKey
ALTER TABLE "member_opening_balances" RENAME CONSTRAINT "member_opening_balances_applied_food_purchase_application_id_fk" TO "member_opening_balances_applied_food_purchase_application__fkey";

-- RenameForeignKey
ALTER TABLE "member_opening_balances" RENAME CONSTRAINT "member_opening_balances_applied_loan_fkey" TO "member_opening_balances_applied_loan_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_opening_balances" RENAME CONSTRAINT "member_opening_balances_applied_procurement_request_fkey" TO "member_opening_balances_applied_procurement_request_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_payment_receipt_allocations" RENAME CONSTRAINT "member_payment_receipt_allocations_food_purchase_application_id" TO "member_payment_receipt_allocations_food_purchase_applicati_fkey";

-- RenameForeignKey
ALTER TABLE "member_payment_receipt_allocations" RENAME CONSTRAINT "member_payment_receipt_allocations_posted_share_ledger_entry_id" TO "member_payment_receipt_allocations_posted_share_ledger_ent_fkey";

-- RenameForeignKey
ALTER TABLE "member_payment_receipt_allocations" RENAME CONSTRAINT "member_payment_receipt_allocations_procurement_schedule_item_id" TO "member_payment_receipt_allocations_procurement_repayment_s_fkey";

-- RenameForeignKey
ALTER TABLE "member_payment_receipt_allocations" RENAME CONSTRAINT "member_payment_receipt_allocations_project_financing_request_id" TO "member_payment_receipt_allocations_project_financing_reque_fkey";

-- RenameForeignKey
ALTER TABLE "procurement_repayment_schedule_items" RENAME CONSTRAINT "procurement_repayment_schedule_items_procurement_request_id_fke" TO "procurement_repayment_schedule_items_procurement_request_i_fkey";

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_onboarding_request_id_fkey" FOREIGN KEY ("onboarding_request_id") REFERENCES "member_onboarding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_rate_limit_buckets" ADD CONSTRAINT "auth_rate_limit_buckets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_device_sessions" ADD CONSTRAINT "mobile_device_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_device_sessions" ADD CONSTRAINT "mobile_device_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_device_sessions" ADD CONSTRAINT "mobile_device_sessions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_device_sessions" ADD CONSTRAINT "mobile_device_sessions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_brought_forward_snapshots" ADD CONSTRAINT "tenant_brought_forward_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_special_savings_withdrawals" ADD CONSTRAINT "member_special_savings_withdrawals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_special_savings_withdrawals" ADD CONSTRAINT "member_special_savings_withdrawals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_special_savings_withdrawals" ADD CONSTRAINT "member_special_savings_withdrawals_support_case_id_fkey" FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_special_savings_withdrawals" ADD CONSTRAINT "member_special_savings_withdrawals_ledger_transaction_id_fkey" FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_special_savings_withdrawals" ADD CONSTRAINT "member_special_savings_withdrawals_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_user_notification_preferences" ADD CONSTRAINT "mobile_user_notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_user_notification_preferences" ADD CONSTRAINT "mobile_user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_push_registrations" ADD CONSTRAINT "mobile_push_registrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_push_registrations" ADD CONSTRAINT "mobile_push_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_push_registrations" ADD CONSTRAINT "mobile_push_registrations_mobile_device_session_id_fkey" FOREIGN KEY ("mobile_device_session_id") REFERENCES "mobile_device_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_privacy_requests" ADD CONSTRAINT "account_privacy_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_privacy_requests" ADD CONSTRAINT "account_privacy_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_privacy_requests" ADD CONSTRAINT "account_privacy_requests_support_case_id_fkey" FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_client_authorizations" ADD CONSTRAINT "qa_client_authorizations_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "qa_tester_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_addons" ADD CONSTRAINT "tenant_subscription_addons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_addons" ADD CONSTRAINT "tenant_subscription_addons_tenant_subscription_id_fkey" FOREIGN KEY ("tenant_subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_checkout_intents" ADD CONSTRAINT "subscription_checkout_intents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_checkout_intents" ADD CONSTRAINT "subscription_checkout_intents_tenant_subscription_id_fkey" FOREIGN KEY ("tenant_subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_tenant_subscription_id_fkey" FOREIGN KEY ("tenant_subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_provider_events" ADD CONSTRAINT "subscription_provider_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
