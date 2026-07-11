# Decide Mode-Specific Gates And Validation

Type: research
Status: open
Blocked by: 03, 04, 05

## Question

Which Getting Started steps, completion checks, setup warnings, and finalization gates should be required, optional, hidden, or reworded for each migration mode?

Resolve how mode choice affects charges, shares, profit policy, businesses/profits, profit seasons, admin/member migration, final migration lock, and any "ready for live operations" checks.

Include a specific rule for when the profit-seasons review step should be skipped or shown. The working hypothesis is: brought-forward setup should skip profit-seasons review by default when all entered business/profit records are already shared or still belong to an ongoing/current season whose sharing date is in the future. It should show profit-seasons review when brought-forward records include past pending profit that has not yet been divided into member dividends. Backfill mode should show review when historical profit must be allocated.

## Comments

- User clarification: step 6 may not be necessary in brought-forward configuration because setup is not the time to share proceeds from ongoing businesses. Backfill mode should still expose the profit season review when historical profit must be allocated. If all entered business profit is still within a future sharing season, the app can use that logic to skip step 6 entirely.
- User clarification: brought-forward mode still needs step 6 if entered business profits are pending and outside the current/future sharing window. A completed/pending status should drive whether the onboarding flow asks admins to review sharing now.
