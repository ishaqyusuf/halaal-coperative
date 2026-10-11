# API Permissions

Store-review grant (29 September): only a current platform owner can issue/renew or revoke a personal mobile review grant. Persistence rechecks the actor and permits only a non-owner user confined to one active QA-classified tenant with a QA source domain. The grant is usable only in that selected tenant and server store environment until expiry or revocation, and never adds cooperative role or finance permissions. Ordinary member/staff/admin accounts cannot issue grants; an unpaid reviewer account remains behind the normal mobile gate.

Signed mobile bearer sessions now require a current personal app-access snapshot for ordinary tRPC feature calls, independent of role. The classification comes from the verified signed session kind, not a caller-controlled source header. Billing/Restore, mobile auth, legal, account privacy and named support paths remain available without paid access. Existing tenant membership, member profile/readiness, operation permissions and finance checks still run after paid access. Web sessions do not require a personal mobile subscription. The former tenant subscription no longer blocks member sign-in or portal provisioning; legacy cooperative capacity/operation rules remain pending owner clarification.

## Personal mobile app access — 28 September 2026

`mobileAppAccess.catalog`, `snapshot` and `verifyPurchase` require a signed-in user with active tenant membership but no `manage_subscription` permission; members, staff and administrators have the same personal billing ability. The user and selected tenant are derived from session context. Persistence additionally checks that the provider-signed binding equals that user, that a provider chain is not owned by another user or store environment, that the selected cooperative is a membership of that user for client verification, and that sandbox evidence belongs to an active QA-classified home tenant. A purchase can unlock the same user's second cooperative membership, but it grants no cooperative operation permission and does not gate the free web dashboard.

## Platform refund-review queue — 28 September 2026

- `storeRefundReviews.queue` requires authenticated platform-owner middleware and a second current, nondeleted platform-owner check in the database query. Tenant administrators, finance staff and members cannot read it. The response projects safe metadata from private provider-event payloads; token material and digests remain server-only. `/platform/refund-reviews` returns not-found to non-platform owners before rendering the client view.

## Account deletion operator scope

- `accountPrivacy.revocationScope` requires a current platform owner and a verified, unrevoked request. It returns only that user's current cooperative membership IDs, names/slugs and roles for account-wide access review.
- `accountPrivacy.revokeAccess` requires the same operator authority and an exact acknowledgement of every current membership ID, tenant ID and role. The serializable write rejects changed scope before revoking the global login; last-cooperative-administrator and last-platform-owner checks remain independent. The result is access revocation, never completed erasure.

## Mobile store offer gate — 25 September 2026

Superseded for new purchases on 28 September: the tenant catalog now returns no new offers. Historical tenant receipt verification retains its original administrator scope; personal billing uses the all-role `mobileAppAccess` API above.

- `manage_subscription` remains required to read `subscriptions.storeCatalog`. In sandbox, the database also requires the signed tenant to be active, QA-classified and tied to a QA source domain before returning a purchase binding. In Production, the binding remains available to an authorized subscription administrator for restoration even when new offers are disabled. A live tenant cannot acquire sandbox offers merely by holding an administrator role; provider-verified entitlement writes retain their independent tenant/QA checks.

## Checkout and operations continuation — 2026-09-07

- Checkout status uses the existing `manage_subscription` tenant procedure,
  never a caller-supplied tenant. Unknown or foreign intents are hidden.
- Admin financing/repayment pages retain `view_admin_work_queue` and
  server-derived capabilities. Possessing a cursor grants no access.
- No role grants or payment authority changed. Verification is deferred.


## Purpose

This file documents who can do what across the platform.

## How To Use

- Update when roles or protected actions change.
- Keep permissions aligned with real enforcement in code.

## Initial Roles

- Super admin.
- Tenant admin.
- Finance officer.
- Operations officer.
- Member.

## Sensitive Actions

- Create or update charge definitions.
- Approve or reject loan requests.
- Mark repayments received.
- Publish dividend results.
- Export statements and reports.
- Configure cooperative rules.
- Resolve offline sync conflicts.

## Rules

- Mobile financing-operations visibility requires `view_admin_work_queue`. Cycle controls, request review, and disbursement separately require `review_financing`; operations-only staff therefore remain read-only and members remain outside the staff workspace.
- Financing authorization is rechecked at the database boundary with signed tenant/actor scope, legal expected state, immutable guarantor/approval evidence, current product and overlap policy, request capacity, and final deployable funds. Client capabilities shape presentation only.

- QA accelerator capability and authorization are usable only in server-authorized local, development, and preview environments with complete private configuration; production fails closed regardless of client-controlled inputs.
- Tester credentials authorize one exact QA Domain but no tenant role. Profile discovery is limited to active memberships in QA-classified, non-purging tenants whose persisted `qaSourceDomain` matches exactly.
- QA authorization is additionally bound to its digest-only token, original client/device signal, client kind, contract version, server environment, active credential, expiry, and revocation state. Client-kind substitution cannot switch a mobile authorization into the web session branch, and arbitrary profile ids are never accepted.
- Only platform owners may issue or revoke tester credentials. Raw credentials are displayed once; only digests are stored.
- The fixed-width numeric tester-credential representation changes transport
  reliability only. It grants no role, tenant, member, entitlement, finance, or
  provider authority and remains derived from 32 random bytes.
- Entering a QA profile mints the ordinary role/member/tenant session and preserves all existing entitlement, readiness, self-scope, finance, approval, idempotency, and audit guards.
- Ticket 30 journey roles are declarative test expectations only; every named
  procedure still performs its ordinary server permission and database
  ownership checks. The journey registry grants no capability.
- The completed `member-core-reads` adapter selected only the Starter/healthy
  Member profile. Home, commitments, shares, and statement retained their normal
  signed tenant/member self-scope; the temporary credential itself did not
  authorize any of those reads.
- The negative executor grants no capability either. Invoked checks still use
  ordinary signed sessions; the offline verifier is a client-observation seam
  that must report zero transport calls and cannot substitute a server error for
  suppression proof.
- Stale Operation Profile QA uses an ordinary entitled Tenant Admin and the
  unchanged `manage_operation_profile`/expected-state boundary. It does not
  force a stale fixture into a new mode or accept an entitlement/auth error as
  stale-state rejection. Readback verifies the rejected write did not alter modes
  or review metadata.
- The executed Member finance-denial check preserves that boundary: only a
  production `FORBIDDEN` response qualifies; successful empty data, expired auth,
  validation and network errors fail the proof. Settled Android denial does not
  establish frame-by-frame isolation during hydration/navigation.
- The Starter/healthy role-switch identity has a default Tenant Admin membership
  and a non-default Member membership in the same QA tenant. Sign-in selects the
  default within the resolved tenant; `auth.mobile.switchRole` is the only
  journey step that changes the signed active membership. It must clear scoped
  client state as usual, and neither membership may reach another tenant.
- The Ticket 30 invitation proof does not grant invitation authority. A temporary
  credential is issued only through `platformOwnerProcedure`; profile entry must
  select the exact QA Tenant Admin; `mobile.admin.access.invite` independently
  enforces `manage_roles`; and sign-out plus credential revocation close both
  session layers. The generated invite remains inside the exact QA Domain.
- QA authorization never permits provider effects or financial/destructive commands. Routed QA email or an explicitly registered test adapter is required; Quick Fill prepares drafts only.
- Marketing early access request submission is public.
- Marketing admin approval links are signed bearer links sent to configured platform admins; possession of the unexpired link can trigger the cooperative approval email.
- Early-access-gated cooperative setup requires a signed early access approval token matching the cooperative name and primary contact email.
- Tenant onboarding still requires the signed email-verification token generated after approved setup. A token cannot be reused after its verified cooperative name or reserved workspace slug has created a tenant.
- Public cooperative signup requires a globally unique 3–5-letter prefix. Availability checks are advisory; bootstrap repeats the uniqueness check before creating the tenant, owner access code, and membership.
- Mobile sign-in derives tenant scope exclusively from the globally unique cooperative access code and never accepts tenant input. Tenant-hosted website sign-in resolves the tenant from the custom domain before looking up either email or cooperative code. Both paths use neutral invalid-credential responses and retain rate limiting.
- `trpc.mobile.sessions.list`, `.refresh`, `.revoke`, and `.revokeAll` require an authenticated durable mobile session. They derive tenant/user/current-token/device scope from the signed request; a user may revoke only their own session rows, and refresh can replace only the exact active token presented.
- `trpc.mobile.sessions.adminList`, `.adminRevoke`, and `.adminRevokeAll` require `manage_roles` (`super_admin` or `tenant_admin`). The target user and every session remain inside the active tenant; finance, operations, member, and cross-tenant callers are denied.
- `trpc.subscriptions.snapshot` and `.requestPlanChange` require `manage_subscription` (`super_admin` or `tenant_admin`). Tenant and requesting actor come from the signed active workspace; finance officers, operations officers, members, and cross-tenant callers cannot read commercial details or create intents.
- `trpc.mobile.admin.operationProfile.overview` and `.updateService` require `manage_operation_profile` (`super_admin` or `tenant_admin`). Tenant and actor come from the signed active workspace; finance, operations, member, and cross-tenant callers cannot inspect or mutate tenant service configuration. Direct-route enforcement is authoritative even when the mobile More entry is hidden.
- Subscription entitlement never grants finance or Operation Profile authority. Member login is enforced in the authoritative account-access path, and active-member capacity is enforced in member creation/reactivation paths. Grace and fail-safe states may preserve bounded reads while blocking unsafe expansion; client CTA visibility is not the guard.
- Device-session revocation is authoritative server state. UI visibility is not the guard, and revocation audits contain bounded reason/count/actor evidence without bearer tokens or device hashes.
- Members can view only their own financial records.
- `trpc.mobile.member.commitments` requires the active workspace role to be `member`, accepts no client-selected member identity, and resolves the linked member from the authenticated tenant/user session.
- `trpc.mobile.member.shares.list` and `trpc.mobile.member.shares.createApplication` require the active workspace role to be `member`, accept no client-selected member identity, and resolve the linked member from the authenticated tenant/user session. Share reads expose only that member's tenant-scoped records and published dividends; create remains subject to operational readiness and authoritative share-policy capacity guards.
- `trpc.mobile.member.shares.applications` and `trpc.mobile.member.statement` require the active workspace role to be `member`, accept no client-selected member or tenant identity, and resolve the linked member from the authenticated tenant/user session. Application/statement rows remain tenant/member scoped and statement profit evidence remains published-only.
- `trpc.mobile.member.financing.list`, `.quote`, `.requests`, and `.createRequest` require the active workspace role to be `member`, accept no client-selected member or tenant identity, and resolve the linked member from the authenticated tenant/user session. Create additionally requires operational readiness and the existing live-write, eligibility, term, cycle-capacity, overlap, and transactional finance guards.
- `trpc.mobile.member.guarantorApprovals.list` and `.respond` require the active workspace role to be `member`. The server derives the guarantor member from the session; respond requires deliberate confirmation, a reason for rejection, operational readiness, tenant ownership, and a still-pending request linked to that member.
- `trpc.mobile.member.receipts.list` and `.create` require the active workspace role to be `member`; tenant and member identity are derived from the signed active membership. List exposes only that member's receipt rows and payable targets. Create additionally requires operational readiness plus Operation Profile receipt self-service and may only reference obligations owned by that member.
- `trpc.mobile.member.support.list`, `.detail`, `.create`, and `.reply` require the active workspace role to be `member`; no client-selected member or tenant is accepted. Reads/details/replies enforce tenant/member ownership, receipt-linked creation validates receipt ownership, new-case creation obeys the `support_cases` Operation Profile mode, and closed cases reject replies. Support capabilities never authorize a financial posting or bypass a stricter finance permission.
- `trpc.mobile.member.procurement.list|requests|request`, `foodPurchase.list|applications|application`, and `projectFinancing.list|requests|request` require the active workspace role to be `member`. All page/detail ownership is derived from the signed tenant/user's linked member; page inputs are bounded to 1–50 and selected identifiers cannot cross tenant or member scope. Missing linked profiles fail closed, while disabled, office-only, read-only, closed-cycle, cap, and migration restrictions preserve authorized existing-record reads.
- Member financial and operational mutations require an operationally ready member profile: active member status, verified KYC, and completion of any migration evidence required by the tenant's historical-backfill or brought-forward setup mode.
- Readiness enforcement covers dashboard member submissions and mobile receipt, financing, procurement, project-financing, Foodstuff Purchase, share, and guarantor-response mutations. Member login, member-scoped reads, support create/reply, and document remediation remain available while action is required.
- Super admins can oversee platform-wide setup and tenant support workflows.
- Tenant admins and finance officers operate only within their tenant.
- Charge creation, definition updates, manual applications, waivers, and reversals require a finance-management role. Read-only staff can inspect the tenant-scoped charge registry but do not receive create or update actions.
- Manual charge posting accepts only an active fixed-amount definition. The server resolves its effective dated version and authoritative amount, validates tenant ownership, and rejects percentage or non-positive manual applications.
- Office staff may capture transactions subject to tenant-defined permissions.
- Dashboard navigation visibility currently uses shared role checks only; a more granular permission matrix is intentionally deferred.
- Procurement create permissions are role plus Operation Profile gated:
  - staff create requires a staff role and `procurement` access mode that allows staff create (`office_only` or `member_self_service`);
  - member self-service create requires member role and `procurement` access mode `member_self_service`;
  - `disabled` and `read_only` block new procurement creates while preserving existing-record reads.
- Foodstuff Purchase create permissions are role plus Operation Profile gated:
  - cycle creation and staff-created applications require a staff/finance role and `food_purchase` access mode that allows staff create (`office_only` or `member_self_service`);
  - member self-service applications require member role and `food_purchase` access mode `member_self_service`;
  - both staff-assisted and member-self-service application creation require the selected member to be operationally ready;
  - application/accounting review decisions use exact allowed values and atomic Serializable claims, while application approval rechecks cycle capacity and the active-obligation cap before charge posting;
  - `disabled` and `read_only` block new Foodstuff Purchase cycles and applications while preserving existing cycles, applications, payments, and accounting evidence.
- Collection Source batch posting requires a finance-management dashboard role, live financial writes, and `collection_source_batch_posting` Operation Profile staff create access. Disabled/read-only modes hide the dashboard workflow and block staging, row updates, and posting in the DB layer.
- Member payment receipt submission requires `payment_receipts` Operation Profile member create access. Staff office capture requires both a staff role and `payment_receipts` Operation Profile staff-create access; disabled/read-only modes preserve receipt history while blocking new submissions.
- Receipt review requires a finance-management role. The DB boundary also enforces the tenant finance start date, tenant/member ownership, exact allocation category-to-target shape, and an atomic serializable approval claim before any ledger or obligation posting.
- `trpc.members.list` and `trpc.members.get` require an operations-officer-or-higher role, which includes all staff roles in the shared hierarchy and excludes member-role accounts from the tenant-wide directory. Members continue to use member-scoped dashboard and statement flows for their own records.
- `trpc.contributions.ledger`, `trpc.contributions.list`, `trpc.contributions.memberHistory`, and `trpc.contributions.memberSavings` require an operations-officer-or-higher role. Tenant-wide contribution and member-savings reads never accept a member-role session with an arbitrary member id; members use their dedicated self-scoped statement and mobile commitment contracts.
- `trpc.onboarding.membershipApprovals` and `trpc.onboarding.membershipApprovalSummary` require the shared `manage_members` permission (`super_admin`, `tenant_admin`, or `operations_officer`). Finance-officer and member sessions cannot read the tenant-wide applicant queue or its summary.
- `trpc.mobile.admin.overview` and every `trpc.mobile.admin.members.*` procedure require the same shared `manage_members` permission. This is permission-matrix enforcement, not role-rank enforcement: finance-only staff and members are denied both reads and mutations even though a rank hierarchy might otherwise admit finance officers. Tenant and actor identity always come from the signed active workspace.
- `trpc.mobile.admin.finance.overview` requires `view_admin_work_queue`, which is available to signed staff roles and denied to members. Reading the unified queue does not grant a review capability.
- Mobile work-queue mutations use independent named permissions: receipts, financing, procurement, project financing, and shares require their finance review permissions; Foodstuff Purchase uses its committee review permission; collection follow-up uses `record_collection_follow_up`; support reply/status uses `manage_support`; money-impact support governance uses `approve_money_impact_support`. Tenant and actor identity always come from the signed active workspace, and the database independently rechecks expected record state and tenant ownership.
- `trpc.mobile.admin.projectFinancingOperations.workspace` and `.detail` require `view_admin_work_queue`; member sessions are denied and these reads confer no mutation authority. `review`, `activate`, and `recordDisbursement` independently require `review_project_financing`.
- Every mobile project-financing command derives tenant and actor from the signed active workspace, rechecks tenant ownership, expected state, structure policy, and UUID idempotency in the database, and fails closed while the client is offline or stale. UI capability flags are presentation hints, not authorization.
- `trpc.mobile.admin.shareProfitGovernance.workspace`, `.shareDetail`, and `.profitDetail` require `view_share_profit_governance`, available to signed staff roles and denied to members. These reads confer no review, approval, or publication authority.
- `reviewShare` requires `review_share_request`; `approveProfit` requires `approve_profit_distribution`; `publishProfit` requires `publish_profit_distribution`. Those finance permissions are independently enforced even when a staff caller can read the workspace.
- Every share/profit command derives tenant and actor from the signed active workspace and rechecks tenant ownership, expected state, policy/reconciliation preconditions, and UUID idempotency at the database boundary. UI capabilities are presentation hints only; offline and stale clients cannot submit commands.
- Member share and statement routes remain self-scoped and published-only. Staff visibility of draft/review governance records never widens what a member can read.
- `trpc.mobile.admin.foodPurchaseOperations.workspace` and `.applicationDetail` require `view_admin_work_queue` plus at least one of `release_food_purchase_funds`, `review_food_purchase_applications`, `submit_food_purchase_accounting`, or `review_food_purchase_accounting`; merely viewing the unified queue does not grant Foodstuff Purchase cycle access.
- `createCycle` and release-owned cycle transitions require `release_food_purchase_funds`. Application decisions require `review_food_purchase_applications`. Committee accounting submission requires `submit_food_purchase_accounting`. Accounting review and final completion require `review_food_purchase_accounting`.
- Each mobile Foodstuff Purchase mutation derives tenant and actor from the signed active workspace, then rechecks tenant ownership, expected state, and workflow policy in the database. UI capability flags are presentation hints and never replace server authorization.
- No mobile support permission authorizes financial posting. Financial-adjustment review is governance evidence only; collection follow-up cannot mutate a repayment schedule amount or create a ledger entry.
- `trpc.mobile.admin.repaymentOperations.workspace` and `.facility` require `view_admin_work_queue`, available to signed staff roles and denied to members. These reads confer no repayment or collection command authority.
- `trpc.mobile.admin.repaymentOperations.post` requires `review_financing` (`super_admin`, `tenant_admin`, or `finance_officer`). Operations officers and members are denied; tenant and actor come only from the signed active workspace, while facility ownership and expected state are rechecked in the database transaction.
- `trpc.mobile.admin.repaymentOperations.recordFollowUp` requires `record_collection_follow_up`, available to signed staff roles. That permission authorizes nonfinancial servicing evidence only and cannot post money or mutate principal, schedules, repayments, or ledger values.
- `trpc.mobile.admin.reports.overview`, `.activity`, and `.generate` require `view_reports` (`super_admin`, `tenant_admin`, or `finance_officer`). Operations officers and members are denied even if they navigate directly; mobile tab visibility only mirrors this server policy. The server derives tenant, actor, subscription report/audit depth, and row limits; supplied report keys and filters never widen scope.
- `trpc.mobile.member.statementExport` requires an authenticated active member workspace and resolves the member from that signed context. Staff workspaces cannot supply a member id to reuse the self-service export, and unavailable report entitlements fail closed.
- `trpc.mobile.admin.access.overview` and `.invite` require `manage_roles` (`super_admin` or `tenant_admin`). The mobile invite schema cannot request `super_admin`, the server derives tenant and actor from the signed active membership, and invitation fails before provisioning when the tenant has no configured cooperative prefix. The issued cooperative number and setup delivery state are returned only after the scoped role command succeeds.
- `trpc.mobile.notifications.overview` and `.markRead` require an authenticated active tenant membership. Delivery reads and read receipts are scoped to that tenant, signed actor, and signed user's recipient email; a supplied delivery id cannot cross account or tenant boundaries.
- `trpc.mobile.notifications.registerPush`, `.disablePush`, `.preferences`, and `.updatePreference` require an authenticated active durable mobile-device session. Tenant/user/session/role scope is signed and server-derived; registration fails for revoked, expired, missing, or cross-tenant sessions. Mandatory categories cannot be disabled, and eligible delivery is rechecked against tenant channel policy, subscription availability, intended role, and active endpoint state.
- Mobile exposes no member activation/sign-up surface or executable activation command. Account provisioning and onboarding approval remain authorized staff/web responsibilities. Mobile member creation and status/KYC/onboarding commands retain subscription, live-operation or migration gates, legal transition checks, tenant ownership, required review notes, audit evidence, and existing notification effects; client CTA visibility is never the authorization boundary.
- `trpc.paymentReceipts.list` and `trpc.paymentReceipts.get` require an active tenant session; member-role users are forced to their linked member profile, while staff roles can inspect tenant-scoped receipts and optionally filter by member.
- `trpc.procurement.list` and `trpc.procurement.get` require an active tenant session; member-role users are forced to their linked member profile, while staff roles can inspect tenant-scoped procurement requests and optionally filter by member.
- `trpc.foodPurchase.list` and `trpc.foodPurchase.get` require an active tenant session; member-role users are forced to their linked member profile and receive email-minimized DTOs, while staff roles can inspect tenant-scoped Foodstuff Purchase applications and optional staff filters.
- `trpc.projectFinancing.list` and `trpc.projectFinancing.get` require an active tenant session; member-role users are forced to their linked member profile, while staff roles can inspect tenant-scoped project financing requests and optional staff filters.
- Mobile project-financing quote and create procedures require the member workspace and a linked member profile. The quote derives tenant/user from the signed session; create additionally requires operational readiness and checks the reviewed charge terms in the database transaction. The hash detects stale terms and grants no permission by itself.
- `trpc.loans.requests`, `trpc.loans.portfolio`, `trpc.loans.request`, and `trpc.loans.loan` require an active tenant session; member-role users are forced to their linked member profile regardless of supplied filter or deep-link IDs, while staff roles may inspect tenant-scoped loan records and optional member filters.
- Loan request approval, guarantor evidence review, and disbursement remain finance-management actions. The DB boundary enforces legal transitions, immutable answered guarantor evidence, approved-only one-time disbursement, deployable-funds capacity, and tenant/loan ownership of repayment schedule references.
- `trpc.repayments.schedule`, `scheduleItem`, `history`, `repayment`, and `summary` require a finance-officer-or-higher role and always derive tenant scope from the authenticated request; member-role sessions remain denied access to the tenant servicing workspace.
- Direct repayment posting remains a finance-management action and uses a Serializable transaction that derives the actual earliest-unpaid schedule allocation server-side. Collections follow-up and status reconciliation are staff-only operational actions and cannot mutate repayment or ledger values.
- `trpc.shareApplications.list` and `trpc.shareApplications.get` require an active tenant session; member-role users are forced to their linked member profile, while staff roles can inspect tenant-scoped additional share applications and optional staff filters.
- Dashboard member share submission also requires operational readiness and server-derived remaining unit capacity. Finance review requires the existing finance-management role; its Serializable expected-state claim prevents two reviewers from approving or posting the same pending application twice.
- `trpc.support.list` and `trpc.support.get` require an active tenant session; member-role users are forced to their linked member profile, while staff roles can inspect tenant-scoped support cases and optional staff filters.
- Dashboard support creation requires a staff role plus Operation Profile `support_cases` staff-create access. Dashboard and mobile member creation require a linked member profile plus `support_cases` member-create access. Read-only/disabled modes preserve existing tenant/member-scoped case history.
- Special-savings refund settlement requires a finance-management role, live financial writes, an approved money-impact case, and a not-yet-completed case; its Serializable transaction also enforces available savings and tenant payment-reference uniqueness.
- Dashboard navigation, mobile member tiles, overview queues, and report export cards hide disabled service surfaces when there are no records or pending work to preserve.
- Highly sensitive actions should be audit logged.
- HTTP health routes are public.
- `tenantProcedure` in `apps/api/src/lib.trpc.ts` requires a signed-in session and active tenant context.
- Tenant-scoped tRPC routes should derive tenant context from request or session state, not untrusted payload input.
- Role checks should use shared role hierarchy helpers from `packages/auth` rather than app-local rank maps.
- Dashboard server context now drops a non-platform user if the resolved tenant does not match the user’s tenant, instead of allowing the route tree to proceed with a cross-tenant mismatch.
- Report exports remain limited to workspace admin roles through the shared report-export context gate.

# Mobile staff contribution operations

- `trpc.mobile.admin.contributions.workspace`, `.member`, and `.batch` require `view_contribution_operations`, available to signed super admins, tenant admins, finance officers, and operations officers; member-role callers are denied.
- `.setPlan`, `.closePlan`, `.updateAllocationPreference`, and `.recordPayment` require `manage_member_contributions`, available to signed staff roles. Tenant, actor, member ownership, legal transition, target validity, policy, and expected state are independently enforced in the database boundary.
- `.stageBatch`, `.updateBatchRows`, and `.postBatchRows` require `manage_collection_source_batches`, available only to super admin, tenant admin, and finance officer roles. Operations officers may inspect but cannot mutate Collection Source batches.
- Batch mutation also requires live financial writes and Operation Profile `collection_source_batch_posting` staff-create access. Posting selection, source/period uniqueness, row status, tenant ownership, idempotency, and ledger transactionality are server guards; button visibility never grants authority.

# Mobile staff charge operations

- `trpc.mobile.admin.charges.workspace`, `.detail`, and `.formOptions` require `view_charge_operations`, available to signed super admins, tenant admins, finance officers, and operations officers; member-role callers are denied.
- `.applyCharge` and `.settle` require `manage_charge_operations`, available to super admins, tenant admins, and finance officers. Operations officers can inspect the workspace but cannot execute money-impacting charge commands.
- `.waive` and `.reverse` require `correct_charge_operations`, also limited to super admins, tenant admins, and finance officers. A reason, exact expected state, tenant ownership, and any opposite ledger posting are server requirements.
- Role capability flags shape the client UI only. The permission procedure and database boundary remain authoritative, and all live financial writes retain the cooperative's finance-operation gates.

# QA maintenance permissions

- Only the platform-owner procedure may discover, adopt, preview, start, or poll QA purge runs.
- Tenant procedures reject tenants whose `qaPurgeStartedAt` is set, and the purge job revokes their active sessions.
- Ticket 30 harness cleanup is an internal script/query contract, not a tenant or
  mobile procedure and not a source of user authority. Production plans fail
  before database access. A real purge additionally requires an exact current
  preview fingerprint, zero safety blockers, the exact irreversible confirmation
  phrase, and explicit operator deletion authority.
- The rollback-only rehearsal uses a distinct confirmation phrase and cannot
  persist its delete transaction. It does not authorize a later irreversible
  purge.


### Launch privacy/store permission boundary
Privacy request/list/cancel do not require a paid subscription or financial readiness. User-supplied account/tenant identities are not accepted for own-request access. Platform privacy queue and identity verification require platform-owner middleware plus a current nondeleted owner database check. Native software purchases require manage_subscription authority and transaction-time active administrator revalidation; tenant account binding and store-chain ownership must match. Sandbox entitlement evidence is limited to QA-classified tenants with a QA source.
The processing inventory also requires platform-owner middleware and a current nondeleted platform-owner database check. The server resolves the request's user ID itself and rejects requests that are not in `processing` with access already revoked. It returns only aggregate direct-link counts and cannot advance request status.
Processing-note writes use the same middleware and current database owner check inside a serializable transaction. They require an access-revoked `processing` request, accept only a bounded category/evidence pair and preserve the restricted completion-contact field. Notes and their operator attribution are returned only through the operator inventory; the audit event stores category but not note text.
The bulk operator queue never selects restricted `processingEvidence`; the per-request inventory validates and projects only note fields. The original completion-contact email is not returned by either endpoint.
Access revocation additionally requires the current platform owner, a verified request, explicit confirmation and a documented handover/retention review. The database blocks revoking the last cooperative administrator in any membership tenant or the last platform owner, then invalidates login/device/push access transactionally. Database-backed user-by-ID resolution filters `deletedAt: null`, so already-issued signed web cookies and API bearer tokens lose account authority after revocation. In production, auth user/membership resolution cannot fall back to demo seeds when the database setting is absent or a seed ID is presented. Only the operator queue can read the restricted completion-contact evidence; this is not an erasure-complete permission or claim.


Legal document reads are public only for `legal.current`; acceptance history and writes require active tenant session and current live membership database revalidation. Mobile review state is local to the current account/tenant, and the server recomputes the current document hashes for every write.


Public account-deletion initiation permits only a matched active user in the named workspace to receive a link and applies keyed account/network rate limits to matching and nonmatching input. Redemption requires the stored one-time challenge and rechecks the current user email and membership in a serializable transaction before creating the request. Platform-owner queue and verification remain owner-only with a current database owner check. Email verification never grants login or access to other account data.

Dashboard upload intent, token, finalize and GET require an active membership matching the current tenant and user. The signed intent also binds the uploader, purpose and exact private path; the provider token limits MIME, size and overwrite. Private GET requires a same-tenant business-record reference to that URL. Staff roles may read linked tenant records; member role may read only their own linked member document, receipt, or support case attachment. Unlinked blobs and unmatched roles are denied. `DASHBOARD_PRIVATE_BLOB_ENABLED` remains `0` until metadata lifecycle, retention/deletion, and live authorization QA are complete. Local filesystem POST/GET are development-only.

- Private dashboard upload intent creation and token issuance reject tenants already marked for QA purge. Intent creation checks this inside a Serializable database transaction; the provider-token path also requires a pending row joined to an unmarked tenant. The orphan cleanup route requires a distinct server bearer secret and both private storage and cleanup enable switches.

- A private upload can authorize reads only through its claimed same-purpose business record ID and original uploader and same-tenant saved URL. A second record, mismatched purpose, cross-tenant claim or unclaimed finalized upload is denied. Existing member ownership and staff-role checks still apply.

## Logly attribution — 1 October 2026

Analytics group keys are not access tokens. Dashboard identity comes from its existing verified host/session context and active membership or platform-owner status; public tenant website traffic may have a host-derived group without an account. Native identity comes from the authenticated profile builder after ordinary tenant/membership checks. Clients cannot choose actor/group IDs in the ingestion payload. Signed capture tokens only authorize analytics attribution for their fixed project; they grant no tenant business or reporting access. Future merchant analytics must enforce tenant scope on every read, aggregate and export server-side.


## Preview build delivery — 11 October 2026

Public checks expose only validated public APK metadata. Registry writes require a dedicated 32+ character publisher token and matching local/Preview backend header; Production identities disable this facility. No cooperative role grants publication authority. QA configuration now treats Vercel/explicit Production deployment identity as authoritative over a conflicting Preview flag.

### Domain-only QA entry (11 October 2026)

Current QA clients require no tester credential. An enabled non-Production server permits exact domains from `EMAIL_QA_DOMAIN_ROUTES` only, with a signing secret of at least 32 characters and active QA memberships. Knowledge of a configured QA domain permits selection among that domain's eligible QA identities; this deliberate convenience is limited to QA data. Production capability guards remain mandatory. Ordinary signed sessions, authorization expiry/revocation and workspace permissions remain authoritative.
