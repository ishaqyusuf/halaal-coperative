# Decide Setup Mode Recommendation Heuristic

Type: research
Status: open
Blocked by: 01, 02

## Question

How should Halaalvest decide which setup mode to mark as recommended for a cooperative?

Resolve the recommendation inputs, thresholds, copy, and fallback behavior. The working heuristic from the user is:

- If the cooperative start date is within the last year, recommend `Historical backfill`.
- If the cooperative is older than a year, compare start date age and member count to estimate whether full historical backfill is still reasonable.
- Recommend `Historical backfill` when the amount of historical work appears reasonable.
- Recommend `Brought forward` when the cooperative is older or has enough members/history that entering every past record would take too long.

The answer should define an explicit workload heuristic that can be implemented and tested, such as age in months multiplied by member count, plus any copy explaining that the recommendation is advisory and can be overridden.

## Comments

- User clarification: the recommendation should be based on cooperative start date and member count. Newer cooperatives, especially within a year, should usually be recommended historical backfill. Older/larger cooperatives should usually be recommended brought forward unless the estimated backfill effort is still reasonable.
