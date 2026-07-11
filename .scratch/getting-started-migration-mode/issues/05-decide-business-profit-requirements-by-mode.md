# Decide Business Profit Requirements By Mode

Type: grilling
Status: open
Blocked by: 01, 02

## Question

What exactly should the Businesses, Profits, and History step require in each migration mode?

For full historical backfill, decide whether admins must enter all historical business pools and profit entries that should feed historical member profit allocation.

For brought-forward setup, decide whether admins should enter only ongoing businesses and profit that has not yet been shared, how to phrase that in the UI, and whether already-shared historical profit should be omitted, summarized, or explicitly marked as not needed.

The answer should also resolve how this affects the profit-sharing season review step and the existing "no historical business profit" policy option. In particular, decide how to distinguish profits that must be reviewed for immediate/historical sharing from ongoing businesses whose proceeds will be shared in a future operating season.

For brought-forward mode, decide whether business/profit records need a sharing status column such as `pending` or `completed`. `Completed` means the business profit has already been divided into member dividends. `Pending` means the profit has not yet been shared and may need future season review or future allocation.

## Comments

- User clarification: in brought-forward mode, the setup-time business step should make admins enter ongoing businesses and profits that are not yet shared, not force them through dividend/profit season deduction review during onboarding. If entered businesses/profits are still within an active/current season and the sharing time is in the future, that should be enough to skip the next profit-seasons review step.
- User clarification: if a brought-forward cooperative has old/past pending profits that are not in the current sharing window and have not yet been divided into member dividends, step 6 should be shown. The business/profit table should be able to mark whether each profit is `completed` or `pending`, where completed means the dividend has already been assigned to members and pending means it has not.
