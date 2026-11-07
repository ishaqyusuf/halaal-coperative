# Web-managed mobile access and cooperative collection

Date: 7 November 2026
Status: Proposed plan delivered; implementation and commercial terms not approved.
Scope: Product, collection, entitlement, migration and launch plan only. No runtime,
store configuration, pricing, database or release change is made by this document.

## Recommendation and policy boundary

The proposed collection system is feasible. Moving a mobile-unlock fee to the web
does not itself establish an exemption from store billing requirements. A free
download with paid access must not be described as an entirely free service.

Google explicitly permits consumption-only apps accessing services purchased
elsewhere. Apple requires in-app purchase for feature unlocking unless an exception
applies; its enterprise exception names employees/students and its free companion
exception names particular web-tool categories. Cooperative members are not
automatically covered. Halaalvest is not a reader app. This is a policy-fit concern,
not evidence of a decision on this particular app. Regional exceptions are not a
global launch basis.

Primary sources checked 7 November 2026:
- [Apple review guidelines, 3.1.1 and 3.1.3](https://developer.apple.com/app-store/review/guidelines/).
- [Google payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).
- [Google payments guidance](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en).

Three honest launch choices:
1. Truly free mobile pilot: no current or deferred mobile fee, with a future paid
   change requiring new notice, consent and policy review. This removes this paid
   mobile-unlock issue, not other release requirements.
2. Paid web activation with cooperative collection: implement the flow below,
   subject to distribution-policy fit, especially on iOS. Explain the entire
   fee/collection mechanism in review notes; seek App Review guidance before
   relying on an exception. Guidance is not a guarantee of final approval.
3. Retain compliant native purchases where required; web activation can manage
   eligibility/onboarding without offering an impermissible competing purchase.

A genuine cooperative software contract that includes mobile as a companion may
be considered separately. Renaming the same individual mobile charge is not a
change in commercial substance and does not resolve policy uncertainty.

## Assumptions used to make the proposal concrete

- Web operations and app downloads remain free; six-month/year mobile access is
  paid in the proposed collection model.
- Cooperatives collect on the platform's behalf. Only fully collected mobile-fee
  lines become payable to the platform; unpaid provisional use is a bounded
  platform cost. A cooperative guarantee would be a different commercial model.
- Amounts, currency, tax treatment, processor fees and any cooperative commission
  require explicit terms. No commission or extra deduction is assumed.
- The existing USD store prices ($0.99/six months and $1.99/year) are historical
  approved store prices, not newly approved web prices or an FX conversion rule.
- One personal entitlement covers the same authenticated user's authorized
  cooperative memberships, matching existing behavior. One cooperative collects
  for each term; switching cooperative must not create another fee.
- Staff/admin users without member monthly records use an explicit cooperative
  sponsorship charge on the web, approved by an authorized payer. Never fabricate
  a savings/member record to collect their access fee.

## End-to-end experience

### Cooperative enrollment

An authorized administrator enables mobile access from web onboarding/settings,
accepts collection/remittance terms and identifies billing contacts. Enabling the
channel permits member activations; it does not bill or enroll everyone. Disabling
new enrollment does not cancel paid periods. Preserve role, KYC and membership
controls. An administrator's own mobile use requires personal access or sponsorship.

### Member activation on the web

1. A responsive promotion links to a Mobile access page. It explains the benefit,
   full fee, term, exact start/end dates, collection month and due date.
2. A signed-in eligible member chooses six months or one year. The server returns
   a versioned quote; acceptance fails for changed prices/terms and offers a new
   review. Capture consent, quote version and idempotency key.
3. Atomically create the enrollment, one pending fee obligation, provisional
   access and audit/outbox events. A repeated click cannot create a second fee.
4. Confirm activation and notify designated cooperative staff. Deliver a secure
   setup/recovery link if necessary, cooperative identifier and verified store
   download links. Reuse the existing account; do not email a generated password.
5. Show web status: provisional/active/expired, dates, amount due, collection
   status, receipt and renewal choice. Start with manual renewal and no default
   auto-renewal; later auto-renewal needs separate explicit consent.

Suggested consent, with real values substituted before use:
“Activate mobile access for [six months/year] at [total, currency]. Access starts
[date] and ends [date]. Add this fee once to my [month] cooperative payment,
due [date]. Renewal is not automatic.” Explain the provisional deadline and
nonpayment/cancellation terms alongside this consent.

### Native app

Sign in using the existing account and resolve access from the server. The target
new-user experience has no subscription offers, plan selector, access checkout,
web purchase links or promotional payment notifications. An unavailable-access
screen provides sign-out, account recovery, privacy/deletion and noncommercial
support. Do not turn support or legal pages into a purchase detour.

Cooperative financial information still needs truthful, reconciled totals. Removing
the subscription sales UI must not hide a real posted mobile-fee debit from a
financial statement or silently misstate balances. A read-only historical charge
may therefore remain in a statement, without purchase/renewal controls. If the
requirement is literally no fee information anywhere in mobile, resolve statement
scope explicitly before implementing; do not silently drop ledger rows.

Audit all other native financial flows separately. The app's existing procurement,
repayment and financial-service features are not automatically classified by the
software-access decision, and a blanket consumption-only label is insufficient.

## Monthly collection and remittance

Maintain three independent facts: member owes a fee; cooperative collected it;
platform received the cooperative's remittance. “Paid monthly contribution” does
not prove the mobile-fee allocation was paid.

Illustration with variables, not approved prices: a member normally pays N10,000
savings and N500 levy. A six-month mobile fee F makes the amount N10,500 + F for
that collection only. Savings remains N10,000. Do not deduct F from savings or
repayment allocations without a separately authorized allocation change.

Proposed first-week schedule, using the cooperative timezone (initially Lagos):

| Event | Rule |
| --- | --- |
| Activation during November | Full term starts immediately; fee belongs to November's collection, with provisional access through 7 December |
| 30 November | Close November's activation statement; preserve accepted amount/date snapshots |
| 1 December | Notify cooperative of provisional activations, collected fees and unpaid fee lines |
| Through 5 December | Reconcile and approve November mobile-fee receipts; this is the invoice cutoff |
| 6 December | Issue one invoice containing fully collected, not previously invoiced fees and authorized sponsorships |
| 7 December | Cooperative remittance due on the website |
| 8 December | Unpaid member provisional access expires unless an authorized sponsorship was recorded |
| Later collections | Restore access after verified collection and include the line in the next invoice; the original term end does not move |

The fifth-day cutoff leaves time to pay within the first week. If collections
normally continue through the seventh, move invoice/remittance dates accordingly;
do not promise both final same-day reconciliation and guaranteed payment.

Six months/year refers to the service term, not monthly charging. A November
activation is not billed again in December merely because it is active. Renewals
create a new explicitly accepted term and fee. A month with no new collectible
fees, renewals or sponsorships has no new mobile invoice, but older arrears remain
due. An old activation collected late can create an invoice in a later month.

Member payment approval ring-fences the platform fee as a remittance payable,
excluded from member savings, share capital, distributable profit and deployable
cooperative funds. An uploaded proof is not a settled payment. Finance must
approve cash/manual evidence or a verified provider event must settle it.

For initial delivery, collect the mobile fee in full as its own allocation; keep
partial amounts in a clearly identified unapplied balance until completed or
refunded, and do not invoice the full fee from partial evidence. Do not let generic
“savings first” remainder allocation silently consume a mobile-fee payment.

## Lifecycle and exceptions

- Term starts at activation; use calendar-month arithmetic, explicit month-end
  clamping and exact displayed expiry. Payment after a suspension restores only
  the remaining original term. Payment after term expiry requires a reviewed new
  term or refund/credit resolution, never silent backdated activation.
- Only one provisional term per account/eligible term. Switching coops, canceling
  or retrying cannot restart free provisional access. One collecting cooperative
  is stored with each term; separate tenant invoices reveal no other tenant's data.
- Existing paid access blocks overlapping purchases. Early renewal, if offered,
  starts after current expiry. No automatic second charge for role/device changes.
- Proposed unpaid cancellation: stop access and waive the uncollected full-term
  fee with an audit entry; do not leave unexplained debt for an abandoned request.
  This makes provisional use a defined platform acquisition cost. Paid refunds
  require a published policy and append-only credits/reversals.
- If the member paid but the cooperative is late remitting, preserve the member's
  paid term. Escalate collection to the cooperative; after notice, restrict new
  activations/sponsorships if necessary. Do not charge the member twice.
- Reversals before invoicing remove eligibility through a recorded adjustment;
  after invoicing use a credit note, never rewrite the issued invoice. Reconcile
  refunds already remitted separately from refunds still held by the cooperative.
- Enabling mobile does not grant new finance permissions. Membership suspension,
  exit and deleted accounts still deny protected data independently of billing.
- An outage does not create a charge or indefinite entitlement. Use a bounded,
  server-verified cached access policy; billing jobs recover idempotently.
- Renewals send advance web/email notices; no interest or compounding late fees.

## Engineering plan

Current source already has `MobileAppAccessPurchase`, provider event history,
`mobileAppAccess` API, server mobile gates and a native access provider. Preserve
these ownership/security boundaries. Add separately sourced cooperative-funded
grants; never manufacture Apple/Google receipt rows or reuse QA reviewer grants.

Candidate records (design names, not committed schema):
- Mobile access enrollment: user, collecting tenant, quote/consent, duration,
  start/end/provisional dates, idempotency and state.
- Versioned price/terms snapshot: amount in minor units, currency, taxes/fees,
  effective dates and consent text version.
- Member mobile-fee obligation and receipt allocation: tenant/member or explicit
  sponsorship payer, due period, amount, collected amount and reversal evidence.
- Cooperative remittance invoice/items: immutable statement snapshot, source fee
  IDs, currency, credits, due date, verified settlement and reconciliation status.
- Access grants: source, subject, period, collection provenance and revocation
  reason, separate from finance permissions and provider receipts.

Reuse existing charge, receipt, ledger, notification and invoice primitives where
their semantics match; keep platform payables distinct from cooperative revenue.
The access resolver combines valid legacy store periods, explicitly authorized
free grants and cooperative collection grants. Tenant and role checks always run.

Permissions: members accept/read their own terms; administrators enable enrollment;
finance roles approve receipts/reconcile; a designated payer remits; platform
operators reconcile platform invoices with audited, limited authority. No member
or ordinary administrator can simply mark the platform invoice paid.

All money writes use transactional guarded state changes. Uniqueness covers
activation commands, one fee per term, invoice inclusion and provider settlements.
Background generation and notification jobs use durable outbox events, bounded
retries and deduplication. Invalid events go to an operator queue.

Web surfaces: member promotion/access page, cooperative enrollment settings,
activation/collection register, remittance invoices and platform receivables.
Member promotion can be prominent and dismissible; hide it after activation.
Keep the admin's overdue collections and finance action queue ahead of marketing.

## Delivery sequence and acceptance

1. Resolve distribution model and commercial defaults. Draft the replacement ADR,
   member terms and cooperative collection agreement. Decide prices/currency,
   provisional deadline, refund terms, sponsoring roles and launch territories.
2. Implement the entitlement/consent/obligation foundation and web activation.
   Deliver the free-pilot branch first if selected, without latent fee obligations.
3. Extend receipt allocation and platform payables; build monthly reconciliation,
   web remittance, invoice exports, reminders and reversal handling.
4. Replace native new-sale UI/gates for the selected policy model. Audit deep links,
   push templates, help destinations, admin routes and legacy app versions.
5. Test with an isolated cooperative through a complete simulated month and term
   boundary, then signed Android/iOS devices. Submit truthful review notes and
   provide reviewer accounts. Roll out only after applicable review and release
   gates pass; keep rollback compatible with granted paid periods.

Required tests include duplicate clicks, concurrent cooperative enrollment,
cross-tenant invoice access, forged mobile source headers, underpayments,
receipt reversal, repeated jobs/webhooks, cutoff/December-January/leap-day dates,
renewals, cancellation, expired provisional access, paid-member/unremitted-coop,
deleted users, staff sponsorship, legacy paid access and stale offline caches.
Run relevant domain/DB/API tests, app typechecks and signed-device login/gating/
recovery QA. Schema changes later require both root db:migrate and db:push under
repository rules; no migration is needed for this planning deliverable.

## Migration and remaining launch obligations

The existing September paid-first-release ADR and October pricing ADR remain the
record of current implementation until a replacement decision is accepted. This
proposal is not authority to change store products or release settings.

Before removing store purchase code, inspect actual production transactions and
active renewals. Configuration alone does not prove paying subscribers exist.
Honor existing paid periods, preserve notifications/refunds/Restore/Manage where
needed and prevent web rebilling while a store subscription can still renew.
Never assume removal of the paywall cancels a store subscription. If active store
subscribers exist, the transition may need a temporary legacy management surface;
the target of zero native billing UI cannot supersede their recovery needs.

Changing billing does not satisfy outstanding privacy/deletion, public legal pages,
publisher identity, financial-service disclosures, secure production configuration,
signed build and device acceptance requirements. Recheck current release evidence;
do not present historical open items as newly verified live state.

## Brain impact

This tracked plan and the local Brain plan index/task record capture the proposal. Existing feature, API, database
and accepted ADR files remain unchanged because runtime behavior and commercial
terms were not changed. Implementation must update those documents together with
the source. No push, deployment, store change or communication to members occurred.
