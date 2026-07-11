# Decide Unit Share Backfill And Dividend Calculation

Type: grilling
Status: open
Blocked by: 01, 02, 05

## Question

How should full historical backfill work when the tenant share model is unit-based shareholding instead of monthly share history?

Resolve whether member backfill needs a dedicated step/table for share purchases with share count and purchase/payment date. Decide how those member share records feed historical profit/dividend calculation.

Also resolve the bulk calculation flow: after all members are onboarded and their historical unit-share records are entered, should staff click a command such as "Calculate backfill dividends" that uses every member's share records plus every profit season to generate member dividend results automatically?

The answer should make clear that unit-based shareholding should not require staff to manually divide profits member-by-member when the system has enough share records to calculate proportional dividend allocations.

## Comments

- User clarification: in backfill, when share configuration is based on the number of shares each member holds, the member backfill form should include a step to specify the shares the member bought and the date paid. After all members are onboarded, staff should be able to calculate backfill dividends from member share records and profit seasons automatically.
