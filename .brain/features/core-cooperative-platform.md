# Core Cooperative Platform

## Purpose

This file documents the primary business feature set for the Amanah cooperative SaaS.

## How To Use

- Update when core member, contribution, loan, charge, dividend, or office workflows change.
- Keep this aligned with implemented business rules.

## Goal

- Provide a multi-tenant cooperative operations platform for managing member savings, interest-free financing, charges, dividends, and office workflows.

## Users

- Tenant admin.
- Finance officer.
- Office staff.
- Member.

## Key Flows

- Register a cooperative and configure its operating rules.
- Onboard members as civil servant, individual, or business.
- During initial setup, present full historical backfill and brought-forward opening-position onboarding paths so existing cooperatives can start from current book balances when detailed history is too heavy.
- Stage brought-forward member opening balances with separate commitment savings, special savings, share capital, optional share units, active financing outstanding, procurement outstanding, source document reference, review status, and audit evidence.
- Let finance staff stage, approve/reject, apply, and reverse brought-forward opening balances from the member backfill baseline step when the approved row contains savings, share-capital balances, active financing outstanding, and procurement outstanding.
- Configure the tenant share model as either monthly share history or unit-based shareholding with share unit cost, compulsory member share units, and maximum member share units.
- Record contributions through direct deduction or indirect payment flow.
- Apply configured charges such as cooperative levy.
- Let eligible members request quick or normal financing.
- Configure monthly financing cycles that snapshot projected member commitments and split available financing capacity between quick and normal financing.
- Configure live financing settings from the finance loan settings workspace, including allocation percentages, term caps, eligibility multiple, reserve buffer, product active state, dual approval, and deployable-funds safeguard.
- Configure financing guardrails for special-savings eligibility, strict commitment during active financing, emergency/quick overlap blocking, and future procurement overlap policy.
- Automatically post configured loan-fee charges when a loan application is created.
- Request and record member guarantor approval evidence before final financing approval when guarantors are selected.
- Approve financing based on policy and available contribution pool liquidity.
- Notify linked members when financing request or optional share request review status changes and member email contact is available.
- Stage and review procurement requests for cooperative-purchased member items with requested cost, approved cost, and repayment months.
- Configure procurement separately from loans, including maximum payback months and whether commitments stay fixed or can be reduced during procurement payback.
- Let linked members submit their own procurement item requests from `/procurement` and track member-scoped review history.
- Let members and staff allocate approved payment receipts to active procurement repayment schedule items so procurement servicing can be marked partially paid or paid.
- Notify linked members when procurement request review status changes and member email contact is available.
- Stage and review member project financing requests for cooperative investment or facility discussions before any accounting structure is posted.
- Let linked members submit their own project financing requests from `/project-financing` and track member-scoped review history.
- Notify linked members when project financing request review status changes and member email contact is available.
- Let members and staff allocate approved payment receipts to approved/active repayable project-financing facilities so paid and outstanding amounts can be tracked without treating partnership/profit-sharing approvals as repayments.
- Run Foodstuff Purchase as a monthly committee operation for staples such as rice, beans, yam, garri, grains, and similar commodities: release funds to the committee, accept member applications, record committee approvals, and capture end-of-month accounting/profit evidence.
- Configure Foodstuff Purchase separately from loans and procurement, including maximum payback months and whether commitments stay fixed or can be reduced during foodstuff payback.
- Surface Foodstuff Purchase staff work in `/food-purchase` and the overview action queue for pending applications and submitted accounting.
- Let linked members submit their own Foodstuff Purchase applications from `/food-purchase` and track their member-scoped application history.
- Let members and staff allocate approved payment receipts to approved Foodstuff Purchase applications so application paid amounts can be tracked without distributing profit.
- Notify linked members when Foodstuff Purchase application review status changes and member email contact is available.
- Let members and staff stage payment receipts with category-aware and period-aware allocation before finance approval.
- Notify linked members when payment receipt review status changes and member email contact is available.
- Send tenant-scoped email from the cooperative display name and immutable workspace-slug address on the configured verified provider domain.
- Let members open and track their own support cases while staff manage member issues, payment mistakes, account questions, and resolution evidence.
- Show linked members a self-service dashboard with profile status, commitment, savings, special savings, financing exposure, procurement/project/Foodstuff Purchase activity, receipt status, support cases, shares, and recent ledger activity.
- Capture feature requests through the audited support workflow so client feedback can be triaged without changing financial records.
- Emit support-case notification events so staff are alerted to member-opened cases/replies and linked members are alerted to staff-created cases, staff replies, and status changes when email contact is available.
- Review an activity report showing performer, authorizer/reviewer when available, date, affected entity, and key before/after details for auditable events.
- Export a member register with contact, KYC, deduction source, status, and linked-login evidence for offline governance review.
- Export brought-forward opening balances with source documents, review/apply/reversal evidence, and unresolved obligation amounts for offline migration audit.
- Export share positions with member share ledger balance, active share model, unit-based position totals, and share-request counts for offline governance review.
- Export payment receipts with member proof metadata, review status, allocation categories, period intent, and posting links for offline reconciliation.
- Export special savings rows separately from general contributions so voluntary extra savings can be reviewed as its own member money bucket.
- Export support cases with linked records, assignment, resolution, and money-impact evidence for offline governance review.
- Export project financing requests with member business, requested amount, approval structure, reviewer, and payback evidence for offline governance review.
- Export procurement requests with item/vendor, requested and approved costs, repayment estimates, reviewer, and review notes for offline governance review.
- Export Foodstuff Purchase cycles and applications with released funds, member approvals, paid/outstanding application evidence, committee accounting totals, and profit evidence for offline governance review.
- Review operational trust readiness covering exports, restore posture, legal terms, monitoring, feature requests, reliability messaging, and safe error disclosure.
- Track repayments, balances, transactions, and dividends.
- Provide dashboards and account history for members and staff.

## Business Rules

- Financing funds come from the cooperative contribution pool.
- Financing is interest-free.
- Member financing cap is up to 2x total savings, subject to liquidity and approval.
- Quick financing term is 3 months.
- Normal financing term is 18 months.
- Monthly financing capacity can be modeled from projected active member commitments, with defaults of 30% reserved for quick financing and 70% for normal financing.
- Opened monthly financing cycles preserve capacity, reserve, and allocation snapshots so later policy changes do not rewrite historical cycle decisions.
- Loan request intake requires an open current monthly financing cycle and blocks requests that exceed the remaining quick or normal allocation.
- Submitted, under-review, and approved requests reserve monthly intake capacity; rejected, cancelled, and expired requests release that capacity.
- Disbursement uses actual deployable funds as the final safety check and can block an approved loan when collected funds are insufficient.
- Loan requests can include guarantor members. Final approval is blocked while any selected guarantor is pending or rejected; finance staff can record guarantor response evidence with notes and audit metadata, and linked guarantor members can approve or reject their own pending guarantor requests from member self-service.
- Loan request review notifications must use the reviewed tenant-scoped request, preserve member scoping, and send direct audited email only when the borrower member profile has an email address.
- Tenant policy controls whether special savings counts toward financing eligibility. When excluded, eligibility uses posted commitment portions instead of the all-in savings snapshot.
- Tenant policy can block quick/emergency financing while a member has approved, disbursed, or active financing.
- Strict commitment mode blocks reducing an active monthly commitment while the member is serving financing. Flexible mode allows the reduction.
- Tenant policy can block procurement requests while a member has approved, disbursed, or active financing.
- Procurement has its own term cap and commitment-reduction policy. When procurement is configured as fixed-commitment during payback, member commitment reductions are blocked while the member has active unpaid procurement obligations.
- A repayment that clears the outstanding financing principal completes the loan and stops remaining scheduled servicing by marking unpaid schedule rows as waived with audit evidence.
- Procurement requests are separate from ordinary financing: they capture item/vendor details, requested cost, requested repayment months, review status, approved cost, approved repayment months, monthly repayment estimates, purchase evidence, and active repayment schedules. Approval is review evidence; purchase activation creates the member's procurement repayment schedule, approved procurement receipt allocations service selected schedule rows, and procurement views surface due/overdue schedule risk.
- Procurement review notifications must use the reviewed tenant-scoped request, preserve member scoping, and send direct audited email only when the member profile has an email address.
- Project financing requests are separate from ordinary financing and procurement: they capture member business details, requested amount, optional proposed structure, review decision, approved amount, approved structure, disbursement evidence, principal-only payback evidence when approved as a repayable facility, and receipt-backed paid/outstanding evidence for repayable facilities. Approval does not create a loan ledger, create profit-sharing allocations, or post non-repayable member obligations.
- Project financing review notifications must use the reviewed tenant-scoped request, preserve member scoping, and send direct audited email only when the member profile has an email address.
- Foodstuff Purchase is separate from procurement and ordinary commitments: a monthly cycle records funds released to the Foodstuff Purchase committee, member applications for staple items, committee approval decisions, approved-application payment evidence, and end-of-month accounting/profit. Receipt posting can settle approved application amounts, while accounting evidence does not yet post member obligations, savings changes, or profit distributions.
- Foodstuff Purchase has its own term cap and commitment-reduction policy. When configured as fixed-commitment during payback, member commitment reductions are blocked while the member has active unpaid Foodstuff Purchase obligations.
- Foodstuff Purchase application review notifications must use the reviewed tenant-scoped application, preserve member scoping, and send direct audited email only when the member profile has an email address.
- Foodstuff Purchase accounting review accepts submitted committee accounting or rejects it for correction with audit evidence; review does not post obligations or distribute profit.
- Foodstuff Purchase accounting review notifications must use the reviewed tenant-scoped cycle, preserve submitter scoping, and send direct audited email only when the submitting committee user has an email address.
- Workspace role settings let admins provision tenant users, assign cooperative roles, set default memberships, and review a module/action permission matrix for staff and member access boundaries.
- Tenant admins and finance officers can update live financing policy and product settings through audited settings actions.
- The finance loan settings workspace must distinguish projected commitment capacity from actual received collections and deployable-funds safety.
- Tenant share policy defaults to monthly share history mode plus one compulsory share, twenty maximum shares, and NGN 10,000 per share unless a cooperative changes it.
- Each cooperative selects one active share model: monthly share history for dated migration/backfill share amounts, or unit-based shareholding for fixed share-unit ownership rules.
- Unit share amount, compulsory units, and maximum units are active only in unit-based shareholding mode; monthly share history mode ignores inactive unit settings and normalizes them back to defaults.
- Share policy changes are tenant-scoped, audited, and do not rewrite dated share capital history or posted share ledgers.
- Dated share history setup and member backfill share resolution should only run when the cooperative has selected the monthly share history model.
- Unit-based optional share applications are staged as pending requests and only post to member share capital after finance approval.
- Members with linked profiles can submit and track their own optional unit share requests only when the cooperative has selected the unit-based shareholding model.
- Share application review notifications must use the reviewed tenant-scoped application, preserve member scoping, and send direct audited email only when the member profile has an email address.
- Share capital remains separate from savings, commitments, repayments, charges, procurement, and special savings.
- Brought-forward opening balances are staged migration inputs until reviewed and applied; they must not be confused with ordinary monthly transactions or silently post to live balances.
- Opening-balance approval is review evidence only until finance applies the approved row. The current apply path posts opening commitment/special savings and share capital as auditable brought-forward records, converts active financing outstanding into a linked active loan with one opening schedule item, converts procurement outstanding into a linked active procurement request with one opening schedule item, and the reversal path posts opposite brought-forward entries with required notes while closing/cancelling linked opening obligations only if no repayment activity exists.
- Member payment receipts are staged until reviewed. Supported approval paths post commitment, special-savings, loan-servicing, share-purchase, procurement repayment, food-purchase application, and repayable project-financing allocations through existing contribution/repayment/share ledgers or selected product target rows; unsupported categories such as other remain blocked until their dedicated ledgers are implemented.
- Member receipt reads and submissions must be scoped to the logged-in user's linked member profile; finance staff retain the tenant-wide review queue.
- Receipt allocations can target current, future, back/defaulted, or unspecified periods. Review-side allocation changes require an adjustment reason.
- Receipt review notifications must use the reviewed tenant-scoped receipt record, respect the linked member boundary, and record email delivery audit evidence when an email is sent.
- Member self-service statements must resolve the member from the authenticated user and tenant, never from a user-supplied member id.
- Support cases can document member issues and money-impact concerns, but they must not directly change posted financial records; finance corrections still need controlled adjustment, waiver, reversal, or posting workflows.
- Support cases that require financial adjustment approval must be approved before they can be resolved or closed, and that approval is governance evidence only, not a financial posting.
- Feature requests use a dedicated support category and inherit support assignment, replies, status changes, export, and audit behavior.
- Receipt-linked support cases are available from payment receipts; member-created links are scoped to the logged-in user's own receipt records.
- Member support case reads, creation, and replies must be scoped to the logged-in user's linked member profile; staff support queues remain tenant-scoped.
- Support notification events must preserve the same tenant and member boundaries as the support action. Member-directed support emails require a linked member email; staff-directed support emails follow tenant role notification preferences and record delivery audit entries.
- Trust readiness is a pilot posture surface. It can show configured monitoring, existing exports, and saved legal/incident/backup/recovery evidence, but legal terms, restore guarantees, and formal uptime commitments require external operational confirmation.
- Unhandled dashboard crashes should show safe recovery guidance without exposing raw stack traces, database details, or infrastructure internals.
- The activity report normalizes audit logs into staff-readable governance evidence, including actor, authorizer/reviewer, timestamp, affected record, and compact metadata summaries.
- Cooperatives may distribute business profit as dividends to members.
- Cooperatives may continue creating and operating business pools after initial migration; only historical migration inputs and published allocation history should lock.
- Business profit should be attributed to configured profit-sharing periods, such as annual, semi-annual, quarterly, or ad-hoc seasons.
- Historical business profit seasons must be reviewed before member migration consumes them; reviewed season deductions need an auditable reason and should reduce distributable profit before member allocation.
- Publishing share-profit allocations rebuilds the linked dividend period's member allocation totals from all published profit entries in that season. The dividend period is marked `published` only when every linked non-archived profit entry has published allocations.
- Published dividend allocations are visible to members through their dashboard and statement download, and to staff through printable member statements and member statement CSV exports.

## Data Model Impact

- Members need category and payment channel attributes.
- Tenant policies need a share configuration mode plus share unit amount, compulsory share unit count, and maximum share unit count.
- Member share applications need tenant-scoped request, review, status, unit-count, price snapshot, value snapshot, and audit metadata before approved requests create share-ledger entries.
- Member payment receipts need tenant-scoped receipt, allocation, review, duplicate-reference, proof-document, posted-link, category, target-period metadata, and optional procurement repayment schedule targets.
- Member opening balances need tenant-scoped member, opening date, separate balance fields, source document reference, review/apply/reversal metadata, optional linked applied loan id, optional linked applied procurement request id, and audit metadata before/after posting.
- Financing products need configurable terms, eligibility policies, and overlap/commitment guardrails.
- Loan guarantor approval records need tenant-scoped request, guarantor member, pending/approved/rejected status, response evidence, staff responder, and audit metadata.
- Procurement requests need tenant-scoped member, item, vendor, requested/approved cost, requested/approved repayment months, estimated monthly repayment, status, reviewer, policy payback/commitment snapshot, and audit metadata. Procurement policy has separate tenant settings for maximum payback months and commitment reduction mode during payback.
- Project financing requests need tenant-scoped member business details, requested/approved amount, proposed/approved structure, optional payback months, principal-only payback estimate for repayable facilities, disbursement evidence, paid amount/date evidence, review status, reviewer, and audit metadata.
- Foodstuff Purchase cycles need tenant-scoped period, released amount, release date, committee accounting totals, profit amount, accounting/review metadata, and linked member applications with requested/approved payback months, approved/paid amount evidence, and policy payback/commitment snapshots. Foodstuff Purchase policy has separate tenant settings for maximum payback months and commitment reduction mode during payback.
- Monthly financing cycles need tenant-scoped snapshots for projected commitment capacity, received contribution amount, reserve buffer, quick/normal allocation percentages, quick/normal budget amounts, and cycle status.
- Charges need reusable definitions and applications.
- Support cases need tenant-scoped case, message, assignment, linked-record, money-impact, financial-adjustment approval, status, priority, and resolution metadata.
- Loan-fee charge definitions use `ChargePurpose.loan_fee`, are one-time loan-application charges, and post explicit `ChargeApplication` rows linked to `LoanRequest`.
- Dividend periods, dividend allocations, business-profit entries, and share-profit allocations need tenant-scoped records.
- Business and profit records need a clear distinction between historical migration records, live operating records, draft allocation periods, and published allocations.
- Dividend periods can carry reviewed season deduction metadata during initial migration so profit distribution remains auditable before publication.
- Published dividend period allocations are member-level season summaries rebuilt from the detailed published `ShareProfitAllocation` rows for linked profit entries.
- Financial events should remain ledger-compatible and auditable.

## Permissions

- Members can view their own account progress and activity.
- The member dashboard must derive the member profile from the authenticated user and must not accept a client-selected member id.
- Members can submit and track their own optional unit share requests when unit-based shareholding is the selected tenant share model.
- Members can submit and track their own payment receipts.
- Members can create, view, and reply to support cases linked to their own member profile.
- Member guarantor response actions must derive the guarantor member from the authenticated user and must not accept a client-selected guarantor member id.
- Staff permissions must be scoped by tenant role.
- Staff support case creation, replies, assignment, and status changes should be audited.
- Financing settings, cycle controls, approvals, dividend publication, and charge configuration are privileged actions.
- Project financing request review is privileged staff work until member-facing application and a full permission matrix are implemented.
- Foodstuff Purchase cycle funding, committee approvals, and month-end accounting are privileged committee/finance actions until a dedicated permission matrix is finalized.

## Edge Cases

- Eligible member cannot receive financing because pool funds are insufficient.
- Offline-created contribution or repayment records sync after a delay.
- Direct deduction remittance arrives later than expected.
- Dividend distribution rules vary by tenant policy.

## TODO

- Confirm whether office software includes teller-style cash operations, reporting only, or full back-office workflows.
- Confirm whether project financing approvals should later post as repayable facilities, investment partnerships, profit-sharing arrangements, or a mix per request.
