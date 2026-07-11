# Prototype Member Create Brought-Forward Flow

Type: prototype
Status: open
Blocked by: 01, 02, 09

## Question

What should the member creation and post-create flow look like when the cooperative setup mode is `Brought forward`?

Resolve whether the member create form itself should expand into a larger brought-forward form or whether saving basic member information should automatically open the brought-forward capture form. The current preferred direction is: save basic member information first, then automatically open a brought-forward form with a polished reveal interaction.

The prototype should include:

- Required current-state fields: current savings, current special savings, shares/share capital.
- Unit-based share behavior: enter share count, automatically calculate and show total share amount from tenant share price.
- Optional Add button/menu for active obligations.
- Add-on sections for existing loan/financing, procurement, and Food Purchase.
- A simple loan form shape that includes amount, start date, guarantors, and required configuration fields.
- Matching procurement and Food Purchase add-on shapes.
- How the flow differs when the cooperative setup mode is `Historical backfill`, where the post-create action should remain a backfill path.

## Comments

- User clarification: when a member is created and the cooperative mode is brought forward, the system should show brought-forward capture instead of backfill. The member form can either expand, or preferably save basic info first and then automatically open the brought-forward form. The brought-forward form should be a single form with required balances/shares and optional add-on sections for loan, procurement, and Food Purchase.
