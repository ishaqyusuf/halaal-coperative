# Canonical QA Data

Source of truth for the Minna Trust Civil Servants Multipurpose Cooperative website-first QA run.

## Date Basis

- Current QA date: 2026-07-13.
- "This month": July 2026.
- "Last month": June 2026.
- "Two months ago": May 2026.
- Currency: NGN.
- Rounding: display currency to 2 decimals. For equal schedules, accept a final-installment remainder adjustment so the total paid equals the approved principal exactly.

## Cooperative Profile

- Name: Minna Trust Civil Servants Multipurpose Cooperative.
- Tenant slug: `minna-trust-civil-servants-multipurpose`.
- Dashboard URL: `http://minna-trust-civil-servants-multipurpose.halaalvest-dash.localhost`.
- Marketing URL: `http://halaalvest.localhost`.
- Setup mode: brought-forward opening position.
- Commitment collection: mixed automatic and manual collection.
- Payment receipts: member self-service enabled.
- Procurement: member self-service enabled, maximum active unpaid procurement obligations per member is 1.
- Foodstuff Purchase: member self-service enabled, maximum active unpaid Foodstuff Purchase obligations per member is 1, open cycle required for new member applications.
- Shares: unit-based share buying, 1 share = NGN 10,000, compulsory units = 1, maximum units = 19.
- Loan policy: normal/maximum financing term must support 24 months.

## Admin Member Opening Position

- Person: existing tenant admin member.
- Monthly commitment before active loan service: NGN 50,000.
- Monthly commitment during active loan service: NGN 20,000.
- Commitment savings brought forward: NGN 830,000.
- Special savings brought forward: NGN 200,000.
- Share units: 1 minimum unless the browser run records a different verified current share count.
- Share capital at 1 unit: NGN 10,000.

### Active Loan

- Original principal: NGN 1,600,000.
- Loan opened: January 2026.
- Repayment term: 24 months.
- First paid month: February 2026.
- Paid months before QA: February, March, April, May, June 2026.
- Base monthly servicing: NGN 66,666.67.
- Five paid months expected: NGN 333,333.33 to NGN 333,333.35 depending on final-remainder rounding.
- Outstanding at July 2026 opening position: NGN 1,266,666.67, with a tolerance of NGN 0.02.
- July 2026 expected combined active-loan monthly cash obligation: NGN 86,666.67, made of NGN 66,666.67 loan servicing plus NGN 20,000 reduced commitment.
- Brought-forward implementation note: the opening-position workflow captures current active financing outstanding as a brought-forward active loan with an opening schedule item. It does not recreate the full historical 24-row schedule from January 2026.

### Active Procurement

- Item: phone.
- Original cost: NGN 500,000.
- Purchase month: June 2026.
- Payback term: 3 months.
- First repayment due: July 2026.
- Monthly repayment estimate: NGN 166,666.67 with final-remainder adjustment.
- Paid before QA: NGN 0.
- Outstanding at July 2026 opening position: NGN 500,000.

### Active Foodstuff Purchase

- Item: bag of rice.
- Original amount: NGN 50,000.
- Purchase/application month: May 2026.
- Payback term: 2 months.
- Paid month before QA: June 2026.
- Monthly repayment estimate: NGN 25,000.
- Outstanding at July 2026 opening position: NGN 25,000.
- Expected July 2026 result after final payment: Foodstuff Purchase application paid/settled at NGN 50,000 total paid.

## Second Member Scenario

- Name: Aisha Bello.
- Email: `aisha.bello.minna.qa@example.test`.
- Member number: allow system generation unless the UI requires entry; use `MT-0002` only if manual entry is required.
- Member type: individual.
- Collection source: none/manual.
- Joined date: 2026-07-01.
- Monthly commitment: NGN 30,000.
- Opening commitment savings: NGN 150,000.
- Opening special savings: NGN 25,000.
- Share units: 2.
- Share capital: NGN 20,000.
- Opening loan: none. This keeps the member self-service financing, procurement, and Foodstuff Purchase requests isolated from existing obligations.
- Member password for local QA: `Password123!`.

## Second Member Self-Service Submissions

- Receipt:
  - Paid date: 2026-07-13.
  - Reference: `QA-AISHA-JULY-001`.
  - Total amount: NGN 35,000.
  - Allocation: NGN 30,000 commitment savings for July 2026 and NGN 5,000 special savings.
  - Proof URL/name: use a local-safe placeholder accepted by the upload/proof UI; if upload is required, use a generated dummy image/PDF in `.scratch/wayfinder-cooperative-onboarding-qa/evidence/`.
- Loan request:
  - Amount: NGN 200,000.
  - Term: 6 months.
  - Purpose: School fees support.
  - Expected monthly servicing: NGN 33,333.33 with final-remainder adjustment.
- Procurement request:
  - Item: MacBook Pro M1.
  - Amount: NGN 1,500,000.
  - Requested repayment term: 2 months.
  - Expected monthly repayment: NGN 750,000.
  - Approval note: `Approved. Please step into the office for final activities.`
- Foodstuff Purchase request:
  - Item: rice and household staples.
  - Amount: NGN 60,000.
  - Requested payback term: 2 months.
  - Expected monthly repayment: NGN 30,000.

