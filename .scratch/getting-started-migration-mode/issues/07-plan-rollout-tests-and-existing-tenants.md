# Plan Rollout Tests And Existing Tenants

Type: research
Status: open
Blocked by: 03, 06, 08, 09, 10, 11

## Question

How should this migration-mode feature roll out safely before launch and be covered by tests?

Resolve schema migration/defaulting for the pre-launch database, fixture/demo behavior, regression tests for both modes, finance safety tests around mode changes after setup has started, and documentation updates needed in Brain docs.

## Comments

- User clarification: there are no real production users/data yet, so rollout does not need backwards compatibility for existing tenants. This is pre-launch; the implementation can make whatever schema/data updates are needed without preserving live production data.
