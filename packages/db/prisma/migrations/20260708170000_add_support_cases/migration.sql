CREATE TYPE "SupportCaseStatus" AS ENUM ('open', 'in_progress', 'waiting_on_member', 'resolved', 'closed');
CREATE TYPE "SupportCasePriority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "SupportCaseCategory" AS ENUM ('payment_issue', 'account_update', 'shares', 'financing', 'procurement', 'technical', 'other');
CREATE TYPE "SupportCaseLinkedRecordType" AS ENUM ('member', 'contribution', 'repayment', 'loan_request', 'loan', 'share_application', 'procurement', 'receipt', 'other');
CREATE TYPE "SupportCaseMessageAuthorType" AS ENUM ('member', 'staff', 'system');

CREATE TABLE "support_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "member_id" uuid,
  "opened_by_user_id" uuid,
  "assigned_to_user_id" uuid,
  "category" "SupportCaseCategory" NOT NULL,
  "status" "SupportCaseStatus" NOT NULL DEFAULT 'open',
  "priority" "SupportCasePriority" NOT NULL DEFAULT 'normal',
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "linked_record_type" "SupportCaseLinkedRecordType",
  "linked_record_id" uuid,
  "money_impact_requested" boolean NOT NULL DEFAULT false,
  "requires_financial_adjustment" boolean NOT NULL DEFAULT false,
  "resolution_summary" text,
  "resolved_at" timestamptz(6),
  "closed_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "support_cases_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_cases_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "support_cases_opened_by_user_id_fkey"
    FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "support_cases_assigned_to_user_id_fkey"
    FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "support_case_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "support_case_id" uuid NOT NULL,
  "author_user_id" uuid,
  "author_type" "SupportCaseMessageAuthorType" NOT NULL,
  "message" text NOT NULL,
  "attachment_url" text,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "support_case_messages_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_case_messages_support_case_id_fkey"
    FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_case_messages_author_user_id_fkey"
    FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "support_cases_tenant_status_priority_idx"
  ON "support_cases" ("tenant_id", "status", "priority");

CREATE INDEX "support_cases_tenant_member_status_idx"
  ON "support_cases" ("tenant_id", "member_id", "status");

CREATE INDEX "support_cases_tenant_assignee_status_idx"
  ON "support_cases" ("tenant_id", "assigned_to_user_id", "status");

CREATE INDEX "support_cases_tenant_linked_record_idx"
  ON "support_cases" ("tenant_id", "linked_record_type", "linked_record_id");

CREATE INDEX "support_case_messages_tenant_case_created_idx"
  ON "support_case_messages" ("tenant_id", "support_case_id", "created_at");
