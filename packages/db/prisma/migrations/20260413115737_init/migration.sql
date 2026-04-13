-- CreateEnum
CREATE TYPE "ContributionPlanInterval" AS ENUM ('monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('pending', 'posted', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "ContributionChannel" AS ENUM ('payroll', 'transfer', 'cash', 'manual');

-- CreateEnum
CREATE TYPE "ChargeKind" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "ChargeApplicationStatus" AS ENUM ('pending', 'posted', 'waived', 'reversed');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('pending', 'active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('super_admin', 'tenant_admin', 'finance_officer', 'operations_officer', 'member');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('civil_servant', 'individual', 'business');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('pending', 'active', 'inactive', 'suspended', 'exited');

-- CreateEnum
CREATE TYPE "DeductionSourceType" AS ENUM ('ministry_payroll', 'employer_payroll', 'bank_transfer', 'card', 'cash', 'manual');

-- CreateEnum
CREATE TYPE "TenantDomainKind" AS ENUM ('site', 'dashboard', 'custom');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('asset', 'liability', 'equity', 'income', 'expense', 'memo');

-- CreateEnum
CREATE TYPE "LedgerTransactionType" AS ENUM ('contribution', 'charge', 'levy', 'loan_disbursement', 'loan_repayment', 'dividend', 'adjustment');

-- CreateEnum
CREATE TYPE "EntryDirection" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('quick', 'normal');

-- CreateEnum
CREATE TYPE "LoanRequestStatus" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('approved', 'disbursed', 'active', 'completed', 'defaulted', 'written_off');

-- CreateEnum
CREATE TYPE "LoanApprovalAction" AS ENUM ('submitted', 'approved', 'rejected', 'disbursed');

-- CreateEnum
CREATE TYPE "RepaymentScheduleStatus" AS ENUM ('pending', 'due', 'partially_paid', 'paid', 'overdue', 'waived');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('pending', 'posted', 'reversed');

-- CreateEnum
CREATE TYPE "DividendPeriodStatus" AS ENUM ('draft', 'approved', 'published', 'closed');

-- CreateEnum
CREATE TYPE "OfflineSyncStatus" AS ENUM ('pending', 'processing', 'applied', 'conflicted', 'rejected');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('user', 'system', 'integration');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_type" "AuditActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "is_platform_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "ChargeKind" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "is_monthly_levy" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_loan_requests" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_loans" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_members" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "charge_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "charge_definition_id" UUID NOT NULL,
    "contribution_id" UUID,
    "loan_request_id" UUID,
    "loan_id" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "ChargeApplicationStatus" NOT NULL DEFAULT 'posted',
    "assessed_at" TIMESTAMPTZ(6) NOT NULL,
    "waived_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "charge_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "interval" "ContributionPlanInterval" NOT NULL DEFAULT 'monthly',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contribution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "contribution_plan_id" UUID,
    "posted_at" TIMESTAMPTZ(6) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "ContributionStatus" NOT NULL DEFAULT 'posted',
    "channel" "ContributionChannel" NOT NULL,
    "period_label" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividend_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "total_profit_amount" DECIMAL(18,2) NOT NULL,
    "distributable_amount" DECIMAL(18,2) NOT NULL,
    "status" "DividendPeriodStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dividend_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividend_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "dividend_period_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "savings_basis_amount" DECIMAL(18,2) NOT NULL,
    "allocation_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividend_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_type" "LedgerAccountType" NOT NULL,
    "parent_account_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID,
    "loan_id" UUID,
    "contribution_id" UUID,
    "charge_application_id" UUID,
    "repayment_id" UUID,
    "transaction_type" "LedgerTransactionType" NOT NULL,
    "posted_at" TIMESTAMPTZ(6) NOT NULL,
    "reference" TEXT,
    "narration" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ledger_transaction_id" UUID NOT NULL,
    "ledger_account_id" UUID NOT NULL,
    "direction" "EntryDirection" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "loan_type" "LoanType" NOT NULL,
    "term_months" INTEGER NOT NULL,
    "max_savings_multiple" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "loan_product_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "requested_amount" DECIMAL(18,2) NOT NULL,
    "eligible_amount_snapshot" DECIMAL(18,2) NOT NULL,
    "available_pool_snapshot" DECIMAL(18,2) NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "purpose" TEXT,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'submitted',
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "loan_request_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "LoanApprovalAction" NOT NULL,
    "notes" TEXT,
    "acted_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "loan_request_id" UUID NOT NULL,
    "loan_product_id" UUID NOT NULL,
    "principal_amount" DECIMAL(18,2) NOT NULL,
    "outstanding_principal" DECIMAL(18,2) NOT NULL,
    "disbursed_at" TIMESTAMPTZ(6),
    "first_repayment_due_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "status" "LoanStatus" NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayment_schedule_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "principal_due" DECIMAL(18,2) NOT NULL,
    "charge_due" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_due" DECIMAL(18,2) NOT NULL,
    "amount_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "RepaymentScheduleStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repayment_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "repayment_schedule_item_id" UUID,
    "received_by_user_id" UUID NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'posted',
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "member_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "member_type" "MemberType" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "exited_at" TIMESTAMPTZ(6),
    "total_savings_snapshot" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deduction_source_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deduction_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeductionSourceType" NOT NULL,
    "external_reference" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deduction_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_sync_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID,
    "created_by_user_id" UUID,
    "device_id" TEXT,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT,
    "sequence_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OfflineSyncStatus" NOT NULL DEFAULT 'pending',
    "conflict_reason" TEXT,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "kind" "TenantDomainKind" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'NGN',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "status" "TenantStatus" NOT NULL DEFAULT 'pending',
    "is_direct_deduction_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "loan_eligibility_multiple" DECIMAL(10,2) NOT NULL DEFAULT 2.0,
    "quick_loan_term_months" INTEGER NOT NULL DEFAULT 3,
    "normal_loan_term_months" INTEGER NOT NULL DEFAULT 18,
    "reserve_buffer_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthly_levy_amount" DECIMAL(18,2),
    "requires_dual_loan_approval" BOOLEAN NOT NULL DEFAULT false,
    "allow_offline_financial_capture" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_occurred_at_idx" ON "audit_logs"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_entity_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "memberships_tenant_role_idx" ON "memberships"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tenant_user_role_key" ON "memberships"("tenant_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "charge_definitions_tenant_active_idx" ON "charge_definitions"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "charge_definitions_tenant_code_key" ON "charge_definitions"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "charge_applications_contribution_id_key" ON "charge_applications"("contribution_id");

-- CreateIndex
CREATE INDEX "charge_applications_tenant_member_status_idx" ON "charge_applications"("tenant_id", "member_id", "status");

-- CreateIndex
CREATE INDEX "charge_applications_tenant_assessed_at_idx" ON "charge_applications"("tenant_id", "assessed_at");

-- CreateIndex
CREATE INDEX "contribution_plans_tenant_member_idx" ON "contribution_plans"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "contributions_tenant_member_posted_at_idx" ON "contributions"("tenant_id", "member_id", "posted_at");

-- CreateIndex
CREATE INDEX "contributions_tenant_status_idx" ON "contributions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "dividend_periods_tenant_status_idx" ON "dividend_periods"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "dividend_allocations_tenant_member_idx" ON "dividend_allocations"("tenant_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "dividend_allocations_period_member_key" ON "dividend_allocations"("dividend_period_id", "member_id");

-- CreateIndex
CREATE INDEX "ledger_accounts_tenant_type_idx" ON "ledger_accounts"("tenant_id", "account_type");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_tenant_code_key" ON "ledger_accounts"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_contribution_id_key" ON "ledger_transactions"("contribution_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_charge_application_id_key" ON "ledger_transactions"("charge_application_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_repayment_id_key" ON "ledger_transactions"("repayment_id");

-- CreateIndex
CREATE INDEX "ledger_transactions_tenant_posted_at_idx" ON "ledger_transactions"("tenant_id", "posted_at");

-- CreateIndex
CREATE INDEX "ledger_transactions_tenant_type_idx" ON "ledger_transactions"("tenant_id", "transaction_type");

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_transaction_idx" ON "ledger_entries"("tenant_id", "ledger_transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_account_idx" ON "ledger_entries"("tenant_id", "ledger_account_id");

-- CreateIndex
CREATE INDEX "loan_products_tenant_type_idx" ON "loan_products"("tenant_id", "loan_type");

-- CreateIndex
CREATE UNIQUE INDEX "loan_products_tenant_name_key" ON "loan_products"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "loan_requests_tenant_member_status_idx" ON "loan_requests"("tenant_id", "member_id", "status");

-- CreateIndex
CREATE INDEX "loan_requests_tenant_requested_at_idx" ON "loan_requests"("tenant_id", "requested_at");

-- CreateIndex
CREATE INDEX "loan_approvals_tenant_request_acted_at_idx" ON "loan_approvals"("tenant_id", "loan_request_id", "acted_at");

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_request_id_key" ON "loans"("loan_request_id");

-- CreateIndex
CREATE INDEX "loans_tenant_member_status_idx" ON "loans"("tenant_id", "member_id", "status");

-- CreateIndex
CREATE INDEX "loans_tenant_disbursed_at_idx" ON "loans"("tenant_id", "disbursed_at");

-- CreateIndex
CREATE INDEX "repayment_schedule_tenant_due_status_idx" ON "repayment_schedule_items"("tenant_id", "due_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "repayment_schedule_loan_installment_key" ON "repayment_schedule_items"("loan_id", "installment_number");

-- CreateIndex
CREATE INDEX "repayments_tenant_loan_paid_at_idx" ON "repayments"("tenant_id", "loan_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE INDEX "members_tenant_status_idx" ON "members"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "members_tenant_member_type_idx" ON "members"("tenant_id", "member_type");

-- CreateIndex
CREATE UNIQUE INDEX "members_tenant_member_number_key" ON "members"("tenant_id", "member_number");

-- CreateIndex
CREATE INDEX "deduction_sources_tenant_type_idx" ON "deduction_sources"("tenant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "deduction_sources_tenant_name_key" ON "deduction_sources"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "offline_sync_events_tenant_status_captured_at_idx" ON "offline_sync_events"("tenant_id", "status", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "offline_sync_events_tenant_sequence_key" ON "offline_sync_events"("tenant_id", "sequence_key");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_hostname_key" ON "tenant_domains"("hostname");

-- CreateIndex
CREATE INDEX "tenant_domains_tenant_kind_idx" ON "tenant_domains"("tenant_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_policies_tenant_id_key" ON "tenant_policies"("tenant_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_definitions" ADD CONSTRAINT "charge_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_applications" ADD CONSTRAINT "charge_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_applications" ADD CONSTRAINT "charge_applications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_applications" ADD CONSTRAINT "charge_applications_charge_definition_id_fkey" FOREIGN KEY ("charge_definition_id") REFERENCES "charge_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_applications" ADD CONSTRAINT "charge_applications_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_applications" ADD CONSTRAINT "charge_applications_loan_request_id_fkey" FOREIGN KEY ("loan_request_id") REFERENCES "loan_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_applications" ADD CONSTRAINT "charge_applications_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_plans" ADD CONSTRAINT "contribution_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_plans" ADD CONSTRAINT "contribution_plans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contribution_plan_id_fkey" FOREIGN KEY ("contribution_plan_id") REFERENCES "contribution_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividend_periods" ADD CONSTRAINT "dividend_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividend_allocations" ADD CONSTRAINT "dividend_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividend_allocations" ADD CONSTRAINT "dividend_allocations_dividend_period_id_fkey" FOREIGN KEY ("dividend_period_id") REFERENCES "dividend_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividend_allocations" ADD CONSTRAINT "dividend_allocations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "ledger_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_charge_application_id_fkey" FOREIGN KEY ("charge_application_id") REFERENCES "charge_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_repayment_id_fkey" FOREIGN KEY ("repayment_id") REFERENCES "repayments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_transaction_id_fkey" FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_products" ADD CONSTRAINT "loan_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_loan_product_id_fkey" FOREIGN KEY ("loan_product_id") REFERENCES "loan_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_approvals" ADD CONSTRAINT "loan_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_approvals" ADD CONSTRAINT "loan_approvals_loan_request_id_fkey" FOREIGN KEY ("loan_request_id") REFERENCES "loan_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_approvals" ADD CONSTRAINT "loan_approvals_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_loan_request_id_fkey" FOREIGN KEY ("loan_request_id") REFERENCES "loan_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_loan_product_id_fkey" FOREIGN KEY ("loan_product_id") REFERENCES "loan_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_schedule_items" ADD CONSTRAINT "repayment_schedule_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_schedule_items" ADD CONSTRAINT "repayment_schedule_items_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_repayment_schedule_item_id_fkey" FOREIGN KEY ("repayment_schedule_item_id") REFERENCES "repayment_schedule_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_deduction_source_id_fkey" FOREIGN KEY ("deduction_source_id") REFERENCES "deduction_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deduction_sources" ADD CONSTRAINT "deduction_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sync_events" ADD CONSTRAINT "offline_sync_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sync_events" ADD CONSTRAINT "offline_sync_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sync_events" ADD CONSTRAINT "offline_sync_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_policies" ADD CONSTRAINT "tenant_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
