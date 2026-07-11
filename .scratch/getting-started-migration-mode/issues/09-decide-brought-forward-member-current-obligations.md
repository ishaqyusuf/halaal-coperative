# Decide Brought-Forward Member Current Obligations

Type: grilling
Status: open
Blocked by: 01, 02

## Question

What current member obligations and balances must be captured in brought-forward member setup so the system can continue from the member's current position?

Resolve the member setup fields for current loan servicing, active financing outstanding, procurement outstanding, Food Purchase outstanding/current servicing, savings balances, share capital/share units, and any other current obligations that must be staged, reviewed, and applied.

The answer should distinguish brought-forward current-state capture from full historical backfill. Historical dividends that already landed in member savings should not be reconstructed in brought-forward mode; the member's current savings/share/obligation position should carry them forward.

Resolve the required vs optional fields for the brought-forward member form. The working rule from the user is that current savings, current special savings, and shares/share capital are required. Existing loans, procurement, and Food Purchase obligations are optional add-on sections.

## Comments

- User clarification: in brought-forward mode, dividends that were already shared have already landed in member savings, so the system does not need past dividend reconstruction. Member setup must capture current loan servicing, procurement, Food Purchase, current loans/financing, and other active obligations so live operations continue from the current status.
- User clarification: the brought-forward member form should require current savings, special savings, and shares/share capital. If the tenant share model is unit-based shareholding, staff should enter the number of shares and the system should calculate/display the total share amount automatically. Loan, procurement, and Food Purchase are optional add-on sections opened from an Add button.
