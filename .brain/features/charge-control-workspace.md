# Charge Control Workspace

## Purpose

The `/charges` workspace is the finance control surface for defining cooperative charges, applying eligible fixed charges to members, reviewing dated definition history, and correcting recent posted applications.

## Page Contract

- The route awaits one tenant-scoped `trpc.charges.chargeLibrary` query before hydration. The client consumes that same query through Suspense; it does not poll or fall back to a second route-owned list.
- The charge library is a bounded configuration registry, not a financial ledger. It returns the complete filtered registry rather than exposing artificial infinite pagination over an in-memory result.
- Search, active status, frequency, value type, and sort are URL-owned and use one shared server/client input builder.
- Definition history is query-owned. Mutations invalidate the charge-library query and refresh the route-owned analytics and recent-application summary.
- Empty workspaces and filtered no-results are distinct. Create actions are only visible to roles that can manage charges.

## Responsive Contract

- At widths below `md`, analytics and the desktop table are hidden.
- Mobile uses a flat, divided shadcn Item list with a dedicated Item skeleton; the page never renders a desktop table or table skeleton on a small screen.
- Search stays visible while filters and page actions use shadcn bottom drawers with touch-sized controls.
- Definition, application, and dated-version workflows use full-screen mobile sheets and retain the existing desktop sheet width at `md` and above.
- Scrolling down hides the main dashboard header while keeping the page context available; scrolling up reveals the main header again.

## Dashboard Page Review

- The dashboard presents one active dataset at a time through URL-owned `Definitions` and `Applications` tabs. Switching tabs performs a non-shallow navigation so the server-owned view and the visible tab cannot drift apart.
- The page uses one flat desktop summary strip and divider-led sections. Definition history and activation controls live in each row's compact action menu; the former duplicate history registry and action-card stack are removed.
- Desktop search and filters stay anchored beside the table, while mobile uses a visible search field, a plus action that opens a shadcn bottom drawer, flat divided filter choices, and Item rows instead of the desktop table.
- Successful charge mutations invalidate the exact charge-library query, close URL-owned sheet state, and then refresh route-owned summaries. The QA Quick Fill recipes use the current UTC accounting date so live definitions and application drafts cannot silently start with an invalid backdated value.
- Authenticated Portless QA created a real current-dated `Monthly Levy` definition for Safa, verified mobile filters and compact row history actions, and exercised the application form through a valid fully populated draft without posting a member liability. Breakpoint behavior passed at 360, 767, 768, and 1440 pixels.

## Financial Safety

- Manual charge application is limited to active, fixed-amount definitions. The server resolves the effective dated version and derives the authoritative amount; a client-supplied amount is ignored.
- Percentage charges are assessed only by a configured workflow with a server-owned basis amount. The manual application sheet does not offer them.
- Manual amounts must be finite and greater than zero, and the selected member and definition must belong to the active tenant.
- Waiver, reversal, activation, and dated-version actions remain individual, URL-owned workflows and refresh the exact charge-library state after success.

## Mobile Staff Operations

- 2026-09-07 source refinement: From/To filters use floating calendars. The
  visible To day is inclusive while the API keeps its exclusive next-day bound;
  reopening the field subtracts that boundary day before display. The filter
  sheet yields Back to its calendar. Testing and Android screenshots remain
  deferred under the implementation-first instruction.

- The signed staff mobile workspace separates Applications, Monthly levies, and Rules. Applications and levies are bounded, cursor-paginated operational rows; Rules is the bounded configuration registry.
- Staff visibility uses `view_charge_operations`. Applying and settling supported charges uses `manage_charge_operations`; waiver and reversal use `correct_charge_operations`. The database repeats tenant, target, state, amount, definition, and role-sensitive workflow validation.
- Manual applications resolve the authoritative dated definition version on the server. Once any member application references a definition, its existing dated versions cannot be edited or deleted; changes require a new dated version.
- Pending `pay_separately` applications settle through a tenant-unique payment reference and balanced cash/income ledger posting. Posted waiver and reversal create opposite ledger evidence; pending waiver does not manufacture a ledger entry.
- Each mobile command carries a UUID receipt, bounded expected state, and deterministic payload fingerprint. Exact retries return the canonical result; stale state or mismatched command reuse fails closed.
- Monthly levies remain explicitly labelled and separate from savings, financing principal, repayment, and the cooperative's Halaalvest SaaS subscription.

## Remaining Lifecycle Hardening

Ticket 20 completes the mobile staff boundary for supported manual application, separate-payment settlement, waiver, reversal, idempotency, and immutable dated-version evidence. Broader non-mobile workflow paths still require a separate cross-workflow audit for exact applicability snapshots and target ownership before the whole charge lifecycle can be called fully hardened.

## Release concurrency hardening — 10 October 2026

Settlement, waiver and reversal now atomically claim the tenant-scoped observed application status inside their transaction before ledger or savings effects. A competing stale request receives a conflict, including settlement versus pending waiver. Correction ledger entries keep a separate `charge-correction:<id>` reference so the original posting remains intact. Regression tests exercise competing correction pairs and pending settlement versus waiver. No schema change is required for this row-locking state transition.
