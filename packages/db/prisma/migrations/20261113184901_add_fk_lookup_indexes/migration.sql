-- CreateIndex
CREATE INDEX "charge_applications_loan_request_id_idx" ON "charge_applications"("loan_request_id");

-- CreateIndex
CREATE INDEX "contributions_contribution_plan_id_idx" ON "contributions"("contribution_plan_id");

-- CreateIndex
CREATE INDEX "import_batch_rows_import_batch_id_idx" ON "import_batch_rows"("import_batch_id");

-- CreateIndex
CREATE INDEX "ledger_entries_ledger_transaction_id_idx" ON "ledger_entries"("ledger_transaction_id");

-- CreateIndex
CREATE INDEX "loan_approvals_loan_request_id_idx" ON "loan_approvals"("loan_request_id");

-- CreateIndex
CREATE INDEX "member_payment_receipt_allocations_receipt_id_idx" ON "member_payment_receipt_allocations"("receipt_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "repayments_loan_id_idx" ON "repayments"("loan_id");

-- CreateIndex
CREATE INDEX "share_business_profit_entries_share_business_id_idx" ON "share_business_profit_entries"("share_business_id");

-- CreateIndex
CREATE INDEX "support_case_messages_support_case_id_idx" ON "support_case_messages"("support_case_id");
