# Simple Member Create And Single-Member Backfill Workflow

Status: in_progress
Created: 2026-06-30
Last Updated: 2026-07-01
Owner: Codex

## Goal

Make member creation intentionally simple, then route any historical setup into a member-scoped backfill step workflow.

The create form should collect only:

- Basic member information
- Joined date
- Starting monthly commitment

When a newly saved member joined before the current month, the dashboard should ask whether to start backfill. The backfill experience should open a step system for that one member, following the same interaction model as Getting Started, rather than the current all-in-one history modal.

The members table should expose the same backfill action in the actions column and disable it once the member has already been backfilled.

After the member backfill workflow is stable, add tenant-configurable loan rule settings so loan history and live loan requests use visible cooperative policy instead of hidden seeded defaults.

## Senior Dev Walkthrough

### Phase 1: Simplify Member Create

The current member create form mixes profile setup with migration/backfill concerns: current savings balance, serving-loan details, commitment history rows, legacy loan history rows, and a calculated overview sidebar. That makes the create path heavy and duplicates the migration system.

Trim `MemberCreateForm` to the minimum fields required to create an active member:

- Member number
- Full name
- Phone
- Email
- Address
- Gender
- Date of birth
- Occupation
- Joined date
- Starting monthly commitment
- KYC fields that are already part of the basic profile, if required by the current schema

Move historical balances, historic commitment changes, serving loan state, legacy loans, defaulting periods, profit/share adjustments, and generated ledger review out of create. Those become backfill workflow steps.

Implementation notes:

- Keep the rich `getMemberStateFromFormData` parser intact because it is reused by onboarding approval and existing migration paths.
- Make `createMemberAction` accept the simplified payload and return a created-member summary: `id`, `memberNumber`, `fullName`, and `joinedAt`.
- Enforce a non-zero starting monthly commitment on the create path so newly created members have a baseline commitment before any backfill is started.
- Do not send `commitmentHistoryJson` or `legacyLoanHistoryJson` from the create form anymore.

### Phase 2: Prompt To Start Backfill After Create

After the member is saved, evaluate whether backfill is likely needed.

Recommended rule:

- Prompt when `joinedAt` is before the first day of the current calendar month.
- On 2026-06-30, any joined date before 2026-06-01 prompts for backfill.
- Joined dates from 2026-06-01 onward do not prompt.

This is better than a rolling "30 days ago" rule because cooperative billing and ledger generation are monthly. If a member joined in a previous month, there may be at least one closed monthly period to backfill.

The prompt should be a small request modal, not the backfill workflow itself:

- Title: Start backfill?
- Context: show the member name, joined date, and that prior monthly periods may need to be generated.
- Primary action: Start backfill
- Secondary action: Later

Choosing Start backfill opens the member-scoped backfill step page for that member. Choosing Later returns the user to the members table.

### Phase 3: Replace BackfillHistoryModal With A Step Workflow

The current `BackfillHistoryModal` is a dense one-screen tool that builds a draft, shows warnings, lists generated rows, saves a draft, and applies backfill. The new feature should keep the existing backend primitives but reshape the UI into steps.

Build a member-scoped step workflow, modeled on `GettingStartedPageView`:

- A left rail or compact step list with status markers
- One active step panel at a time
- Back / Next footer controls
- Save actions inside the relevant steps
- Final review and apply step

The workflow opens as a separate member page from:

- The post-create "Start backfill?" request modal
- The members table action column
- Any future member detail page action

Use the member route for identity and URL-backed state for the active step so table action, post-create prompt, reloads, and deep links all resolve to the same workflow:

- `/members/[memberId]/backfill?step=<step key>`

Do not host this workflow in `/members?backfillMemberId=...`; the member route owns the workflow.

### Phase 4: Single-Member Backfill Steps

Use these steps for the first implementation.

#### Step 1: Member Baseline

Purpose:

- Confirm the member identity and baseline dates.
- Show joined date, cooperative start date, first backfill month, current monthly commitment, and whether the member already has draft/applied backfill.

Data:

- Member profile
- `joinedAt`
- Current member commitment
- Cooperative settings/start date
- Latest draft/applied backfill status

Actions:

- Edit basic member fields only if existing member edit capability already exists.
- Otherwise this step is read-only confirmation with a "Continue" action.

Completion:

- Member exists.
- Joined date exists.
- Starting monthly commitment exists.

#### Step 2: Commitment History

Purpose:

- Capture dated monthly commitment changes between the joined month and today.
- This replaces commitment history entry during member creation.

Data:

- `MemberAmountLog` entries for `monthlyContribution`
- Current monthly commitment

Actions:

- Add dated commitment rows.
- Update/delete commitment rows.
- Quick-fill from starting commitment if no changes exist.

Completion:

- At least one effective commitment exists for the backfill range.

Reuse:

- Existing `CommitmentHistoryPanel`
- `upsertMemberAmountLogAction`

#### Step 3: Activity Windows

Purpose:

- Capture member activity exceptions that affect generated monthly rows.
- This includes paused, defaulting, missed, or other supported activity statuses.

Data:

- Existing member activity events
- Defaulting months, if the current backfill model keeps them as draft adjustments

Actions:

- Add/update activity windows.
- Mark defaulting months.
- Clear temporary/defaulting choices before regenerating preview.

Completion:

- Optional step; considered complete when reviewed.

Reuse:

- Existing `ActivityHistoryPanel`
- `setMigrationBackfillDefaultingMonthsAction`
- `upsertMemberActivityEventAction`

#### Step 4: Loan History

Purpose:

- Capture legacy/current loan state that existed before this member was created in the system.
- This replaces serving-loan and loan-history entry during member creation.

Data:

- `LegacyLoanMigrationDraft` rows for this member
- Guarantor member lookup
- Cooperative loan settings as needed

Actions:

- Add/update/remove legacy loan draft rows.
- Capture loan amount, served amount, payment month, monthly repayment commitment, top-up amount, and guarantors where supported.

Completion:

- Optional step; complete when reviewed.
- Required only if the member has a pre-existing loan position.

Reuse:

- Existing `LoanHistoryPanel`
- `createLegacyLoanMigrationDraftAction`

#### Step 5: Profit And Share Exceptions

Purpose:

- Capture member-specific profit/share adjustments for historical periods.
- Keep this optional because not every member needs an exception.

Data:

- Existing profit migration options
- Existing profit/share adjustments for the member

Actions:

- Add/update member-specific profit/share adjustments.
- Leave empty when the generated default is sufficient.

Completion:

- Optional step; complete when reviewed.

Reuse:

- Existing `BusinessProfitMigrationPanel`
- `upsertMigrationProfitAdjustmentAction`

#### Step 6: Generated Ledger Review

Purpose:

- Generate and review the rows that will be saved/applied for this member.
- Show warnings, month-by-month generated rows, and adjustment affordances.

Data:

- Backfill draft input
- Generated draft rows
- Warnings
- Existing draft batch if present
- Existing applied status if present

Actions:

- Regenerate preview after prior steps change.
- Add/update row-level backfill adjustments.
- Save draft.

Completion:

- Draft preview exists.
- No blocking validation errors remain.

Reuse:

- `getBackfillPreviewAction`
- `queueBackfillDraftAction`
- `MemberLedgerBackfillTable`
- `MemberBackfillAdjustmentDialog`

#### Step 7: Apply Backfill

Purpose:

- Final confirmation and irreversible application for this member.

Data:

- Latest saved draft batch
- Warning summary
- Month count
- Expected contribution/loan/profit totals

Actions:

- Require explicit confirmation text, currently `APPLY BACKFILL`.
- Apply the latest saved draft.
- Refresh members table and any affected ledger/contribution/loan routes.

Completion:

- Applied batch exists for this member.
- Members table action becomes disabled with a clear "Backfilled" state.

Reuse:

- `queueBackfillApplyAction`
- Existing `applyBackfillBatch` backend behavior

### Phase 5: Members Table Action State

Add a backfill status to the member list query so the actions column can render accurately.

Needed statuses:

- `not_started`: no draft or applied backfill
- `draft`: latest backfill draft exists but has not been applied
- `applied`: applied backfill batch/month rows exist

Members table action behavior:

- `not_started`: enabled, label `Backfill`
- `draft`: enabled, label `Continue backfill`
- `applied`: disabled, label `Backfilled`

Implementation notes:

- Use tenant-scoped counts from existing backfill tables.
- Keep the member list payload lightweight. Avoid loading full draft rows for every member.
- The disabled state should be based on applied backfill, not merely on the existence of a draft.

### Phase 7: Loan Rule Settings

Add a tenant-facing loan rules workspace after the member backfill flow is working.

Current system facts:

- `LoanProduct` already stores product-level `termMonths` and `maxSavingsMultiple`.
- `TenantPolicy` already stores tenant-level `loanEligibilityMultiple`, quick/normal loan terms, reserve buffer, and dual-approval preference.
- `submitLoanRequest` already enforces the product term limit and calculates eligibility from the stricter of tenant multiple and product multiple.
- The dashboard does not yet expose a clear settings surface for admins to configure those rules.

Purpose:

- Make cooperative borrowing policy visible, configurable, and auditable.
- Support rules such as "a member can request up to 2x total savings" and "maximum repayment time is 16 months" without hard-coded assumptions.
- Keep Halaal constraints explicit: no interest, no guaranteed disbursement, no hidden fees, and liquidity-aware approval.

Settings to expose:

- Tenant loan eligibility multiple, defaulting to `2`.
- Quick loan term months.
- Normal loan term months.
- Dual loan approval requirement.
- Reserve buffer / deployable-funds threshold used for liquidity checks.
- Loan products with name, type, maximum repayment months, maximum savings multiple, and active/inactive state.

Request/approval behavior:

- Loan request form should show an eligibility preview before submit:
  - member total savings
  - product maximum multiple
  - tenant maximum multiple
  - calculated eligible amount
  - requested amount
  - requested term
  - estimated monthly servicing
  - available pool / deployable funds impact
- Requested amount remains capped by the stricter of tenant and product multiples.
- Requested term remains capped by the selected product.
- Disbursement should block, or require an explicit privileged override, when principal exceeds deployable funds after reserve buffer.
- Approval should make KYC/document completeness, overdue exposure, dual approval, and liquidity warnings visible.

Implementation notes:

- Reuse the existing `TenantPolicy` and `LoanProduct` models before adding new schema.
- Add audit logs for loan policy and product changes.
- Do not mutate existing approved/disbursed loans when a product rule changes; copy policy/product snapshots to new requests only.
- Keep imported/backfilled legacy loan rows separate from live loan policy changes.
- Prefer "loan" in current UI only where the product already uses it; leave future terminology cleanup (`financing`, `qard`, or tenant-configurable label) as a separate product decision.

## Files To Touch

### Member Create

- `apps/dashboard/src/components/forms/member-forms.tsx`
  - Simplify `MemberCreateForm`.
  - Remove create-time commitment history and legacy loan history UI.
  - Remove create-time loan summary/sidebar logic.
  - Submit basic profile, joined date, and starting commitment only.

- `apps/dashboard/src/components/modals/member-create-modal.tsx`
  - Receive created-member summary from `MemberCreateForm`.
  - Open the "Start backfill?" request modal when the joined date is before the current month.

- `apps/api/src/routers/dashboard-actions.route.ts`
  - Return created-member summary from `createMemberAction`.
  - Keep shared rich member-state parsing intact.
  - Revalidate the affected member routes after create.

- `apps/dashboard/src/lib/dashboard-actions.ts`
  - Update the `createMemberAction` wrapper type to expose the created-member summary.

### Backfill Workflow

- `apps/dashboard/src/components/modals/backfill-history-modal.tsx`
  - Replace the all-in-one modal surface or turn it into a compatibility wrapper that opens the new workflow.

- `apps/dashboard/src/components/members/member-backfill-start-modal.tsx`
  - New request modal shown after create or from a future direct start flow.

- `apps/dashboard/src/app/(app)/(sidebar)/members/[memberId]/backfill/page.tsx`
  - New member-scoped page route for the backfill workflow.

- `apps/dashboard/src/components/members/member-backfill-page-view.tsx`
  - New member-scoped step workflow container.

- `apps/dashboard/src/components/members/member-backfill-steps.ts`
  - Step definitions, labels, status helpers, and next/previous ordering.

- `apps/dashboard/src/components/members/member-backfill-steps.ts`
  - Step definitions, labels, status helpers, and next/previous ordering.

- `apps/dashboard/src/lib/members/load-member-backfill-workflow.ts`
  - Member-scoped server loader for profile, migration input rows, generated ledger preview, and backfill status.

- `apps/dashboard/src/components/initial-migration-preview.tsx`
  - Extract reusable panels and helpers that are currently local to this component.
  - Leave the Getting Started flow behavior unchanged.

- `apps/dashboard/src/components/migration/member-migration-input-panels.tsx`
  - Either retire the select-based wrapper for the new flow or keep it only for the existing migration preview if still used.

- `apps/dashboard/src/components/migration/member-migration-history-forms.tsx`
  - Reuse existing exported panels/actions.
  - Export any panel-level pieces needed by the new step workflow.

- `apps/dashboard/src/components/migration/member-ledger-backfill-table.tsx`
  - Reuse for generated ledger review.
  - Adjust props only if the step workflow needs a narrower single-member mode.

### Members Table

- `apps/dashboard/src/components/tables/members/columns.tsx`
  - Replace the current `History` action with the backfill action.
  - Disable when applied.
  - Open the member-scoped workflow when enabled.

- `packages/db/src/queries/members.ts`
  - Include lightweight backfill status in `listMembersTable`.

- `apps/api/src/routers/members.route.ts`
  - Pass the new member-table backfill status through the current API shape if needed.

- `apps/dashboard/src/app/(app)/(sidebar)/members/page.tsx`
  - Ensure the table receives the new status data.

### Tests And Types

- `packages/db/src/queries/members.test.ts`
  - Add coverage for `not_started`, `draft`, and `applied` backfill status mapping.

- Existing backfill tests, if present:
  - Extend only if the workflow requires backend contract changes.
  - The UI should mostly reuse `saveBackfillDraft` and `applyBackfillBatch`.

### Loan Rule Settings

- `packages/db/src/queries/loans.ts`
  - Add tenant-scoped query/mutation helpers for loan products if no suitable helper exists.
  - Keep request eligibility enforcement in the query layer.
  - Add or tighten disbursement liquidity guard behavior.

- `packages/db/src/queries/tenant-finance.ts` or a focused policy query module
  - Add tenant policy update helper for loan eligibility multiple, loan terms, reserve buffer, and dual approval.
  - Audit all policy changes.

- `apps/api/src/routers/dashboard-actions.route.ts`
  - Add dashboard actions for updating tenant loan policy and loan products.
  - Restrict policy/product changes to finance-management roles.

- `apps/dashboard/src/lib/dashboard-actions.ts`
  - Expose wrappers for the new dashboard actions.

- `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/page.tsx`
  - Add or link to a Loan rules section without disrupting existing finance setup.

- `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`
  - Add policy and product forms using the existing shadcn/form patterns.

- `apps/dashboard/src/components/forms/finance-forms.tsx`
  - Add request-time eligibility preview using the selected member and loan product data.

- `packages/db/src/queries/loans.test.ts`
  - Add coverage for product term cap, tenant/product multiple cap, dual-approval behavior, and disbursement liquidity blocking or override.

## Code Shape

### Prompt Rule Helper

```ts
export function shouldPromptMemberBackfill(joinedAt: Date, now = new Date()) {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const joinedMonthStart = new Date(
    joinedAt.getFullYear(),
    joinedAt.getMonth(),
    1,
  );

  return joinedMonthStart < currentMonthStart;
}
```

### Create Action Return Shape

```ts
type CreatedMemberSummary = {
  id: string;
  memberNumber: string;
  fullName: string;
  joinedAt: string;
};
```

### Backfill Step Keys

```ts
export const memberBackfillStepKeys = [
  "baseline",
  "commitments",
  "activity",
  "loans",
  "profit",
  "review",
  "apply",
] as const;

export type MemberBackfillStepKey =
  (typeof memberBackfillStepKeys)[number];
```

### Members Table Backfill Status

```ts
type MemberTableBackfillStatus = {
  state: "not_started" | "draft" | "applied";
  draftBatchId: string | null;
  appliedBatchId: string | null;
  appliedMonthCount: number;
};
```

### Action Cell Behavior

```tsx
const isBackfilled = member.backfillStatus.state === "applied";
const hasDraft = member.backfillStatus.state === "draft";

<Button
  disabled={isBackfilled}
  onClick={() => openMemberBackfill(member.id)}
>
  {isBackfilled ? "Backfilled" : hasDraft ? "Continue backfill" : "Backfill"}
</Button>
```

## Execution Checklist

### Phase 1: Create Form

- [x] Read the existing `MemberCreateForm` submission contract and confirm which fields are required by `createMemberAction`.
- [x] Remove create-time history, balance, and loan migration fields from the form UI.
- [x] Keep basic profile, joined date, and starting commitment.
- [x] Ensure form validation requires a starting commitment greater than zero.
- [x] Update `createMemberAction` to return `CreatedMemberSummary`.
- [x] Update client action types and form success callbacks.

### Phase 2: Post-Create Prompt

- [x] Add `shouldPromptMemberBackfill`.
- [x] Add `MemberBackfillStartModal`.
- [x] After create success, evaluate the joined date against the first day of the current month.
- [x] Open the start modal only when the rule matches.
- [x] Wire `Start backfill` to navigate to `/members/[memberId]/backfill?step=baseline`.
- [x] Wire `Later` to close the prompt and leave the user on members.

### Phase 3: Step Workflow Shell

- [x] Create step key definitions and labels.
- [x] Build `/members/[memberId]/backfill?step=baseline`.
- [x] Add step rail/list and footer controls modeled on Getting Started.
- [x] Add active-step routing through the page `step` query param.
- [x] Load member-scoped backfill data for the active member.
- [x] Handle unavailable, not-found, generated-preview error, already-applied, and write-gated states.

### Phase 4: Step Panels

- [x] Extract reusable backfill controls from the current migration preview where needed.
- [x] Add the Baseline step.
- [x] Add the Commitment History step.
- [x] Add the Activity Windows step.
- [x] Add the Loan History step.
- [x] Add the Profit And Share Exceptions step.
- [x] Add the Generated Ledger Review step with draft save.
- [x] Add the Apply Backfill step with confirmation.
- [x] Ensure draft save and apply refresh all affected routes.

### Phase 5: Members Table

- [x] Extend the member list query with lightweight backfill status.
- [x] Add tests for status mapping.
- [x] Update member table row typing.
- [x] Replace the current `History` action with `Backfill`, `Continue backfill`, or disabled `Backfilled`.
- [x] Confirm disabled means applied, not drafted.

### Phase 6: Cleanup

- [ ] Remove unused imports, helpers, and create-form state after simplification.
- [ ] Confirm Getting Started migration preview still works.
- [ ] Confirm existing backfill backend behavior is unchanged.
- [ ] Update Brain API/docs only if the API contract changes in a durable way.

### Phase 7: Loan Rule Settings

- [ ] Confirm the existing `TenantPolicy` and `LoanProduct` fields are enough for the first settings release.
- [ ] Add tenant loan-policy update helper with audit logging.
- [ ] Add loan-product create/update/archive helper with audit logging.
- [ ] Add dashboard actions with finance-management role checks.
- [ ] Add a settings surface for eligibility multiple, quick/normal terms, dual approval, reserve buffer, and product rules.
- [ ] Add loan request eligibility preview using member savings, tenant policy, product policy, requested amount, requested term, monthly servicing, and deployable funds.
- [ ] Add disbursement liquidity blocking or explicit privileged override.
- [ ] Ensure policy/product changes do not rewrite existing approved, disbursed, imported, or backfilled loan records.
- [ ] Add focused loan-policy tests.

## Validation

Run focused validation after implementation:

```sh
bun run --cwd apps/dashboard typecheck
bun run --cwd apps/api typecheck
bun run --cwd packages/db typecheck
bun test packages/db/src/queries/members.test.ts packages/db/src/queries/backfill.test.ts packages/db/src/queries/backfill-apply.test.ts
```

Manual QA:

- Create a member with a joined date in the current month. Confirm no backfill prompt appears.
- Create a member with a joined date before the current month. Confirm the start-backfill modal appears.
- Choose Later. Confirm the member remains created and the user returns to the members table.
- Choose Start backfill. Confirm the workflow opens for that member on the Baseline step.
- Walk through each step, save a draft, close, reopen from the table, and confirm it resumes as `Continue backfill`.
- Apply the draft. Confirm the members table action becomes disabled and reads `Backfilled`.
- Confirm an already-backfilled member cannot apply backfill again.
- Confirm the existing Getting Started flow still renders and can use the same migration panels.
- Configure a loan product with `maxSavingsMultiple = 2` and `termMonths = 16`. Confirm requests above 2x savings or above 16 months are rejected.
- Configure a stricter tenant eligibility multiple than the product. Confirm the stricter tenant cap wins.
- Configure a stricter product multiple than the tenant. Confirm the stricter product cap wins.
- Confirm the loan request form explains eligible amount and estimated monthly servicing before submit.
- Confirm disbursement cannot silently exceed deployable funds after reserve buffer.

## Open Questions

None blocking.

Assumptions:

- The prompt threshold is calendar-month based: joined date before the first day of the current month.
- The backfill workflow opens as a member-scoped page, with the route member id and `step` query param used for resumability.
- "Already backfilled" means an applied backfill batch or applied backfill months exist for that member, not merely that a draft exists.
- First loan-rule settings release should reuse existing `TenantPolicy` and `LoanProduct` fields unless implementation finds a hard product gap.
