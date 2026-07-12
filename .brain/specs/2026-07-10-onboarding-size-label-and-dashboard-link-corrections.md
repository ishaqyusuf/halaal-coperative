# Spec: Onboarding Size Label And Dashboard Link Corrections

## Problem Statement

Prospective tenant admins finishing workspace onboarding are seeing two confusing completion details.

First, the current cooperative size combobox displays the persisted representative value after selection. Selecting `26-100 members` can leave the closed input showing `100`. Even if `100` is the value stored for that range, the selected input should continue to show the range label the admin chose.

Second, after workspace creation, the dashboard link includes an `/app` path segment. The created workspace should send admins to the canonical tenant dashboard URL without `/app`, including the visible Get Started action and the workspace-ready email link.

These issues make a newly created workspace feel rough at the exact moment the admin expects confirmation and a clean handoff into setup.

## Solution

Keep the persisted cooperative size value unchanged, but make every selected cooperative size input display the shared range label, such as `26-100 members`, after selection.

Update onboarding completion URL generation so the returned dashboard URL, development URL variants, visible dashboard CTA, and workspace-ready email all point at the tenant dashboard root without an `/app` path segment.

## User Stories

1. As a prospective tenant admin, I want the selected cooperative size to keep showing `26-100 members`, so that the form reflects the range I chose.
2. As a prospective tenant admin, I want `26-100 members` to remain visible after the combobox closes, so that I am not confused by the stored value `100`.
3. As a prospective tenant admin, I want all cooperative size options to display their labels after selection, so that single-number sentinel values never appear as the chosen answer.
4. As a platform operator, I want the selected cooperative size value to remain compatible with the existing persisted integer range values, so that no tenant schema migration is required.
5. As a platform operator, I want onboarding validation to continue accepting only configured cooperative size range values, so that invalid ad hoc sizes do not enter tenant records.
6. As a tenant admin, I want the dashboard cooperative profile form to use the same selected range display behavior, so that profile editing stays consistent with public onboarding.
7. As a prospective tenant admin, I want the workspace-ready screen to show a clean Get Started destination, so that the handoff into setup feels trustworthy.
8. As a prospective tenant admin, I want the Get Started link after workspace creation to omit `/app`, so that I land on the canonical tenant dashboard URL.
9. As a prospective tenant admin, I want the workspace-ready email dashboard link to omit `/app`, so that the emailed handoff matches the on-screen handoff.
10. As a platform operator, I want local, portless, production, and configured dashboard origins to build dashboard URLs without `/app`, so that environment-specific routing does not leak a stale product path.
11. As a platform operator, I want development dashboard URL variants to omit `/app`, so that local routing choices stay aligned with the canonical dashboard target.
12. As a platform operator, I want the tenant public site URL to remain separate from the dashboard URL, so that removing `/app` from the dashboard link does not change public site routing.
13. As a tenant admin, I want the created workspace URL to use the tenant slug and expected host, so that I recognize the workspace I just created.
14. As a platform operator, I want the onboarding response to expose the corrected dashboard URL, so that all client-side completion actions use one authoritative target.
15. As a platform operator, I want workspace-ready notification drafts to be created from the corrected dashboard URL, so that email previews and delivered emails are consistent.
16. As a tester, I want a regression test for the cooperative size selected label, so that the raw stored value does not reappear in the combobox trigger.
17. As a tester, I want a regression test for dashboard URL generation, so that `/app` is not reintroduced for non-local or configured dashboard origins.
18. As a product owner, I want both fixes handled as onboarding polish, so that workspace creation feels coherent before the admin starts first-run setup.

## Implementation Decisions

- Treat this as a focused onboarding completion correction, not a redesign of tenant routing or cooperative profile storage.
- Keep the current cooperative size range model and persisted representative integer values. The fix is display behavior, not storage behavior.
- The selected cooperative size trigger should render the shared range label for the selected value. It should not fall back to displaying the raw item value.
- Apply the selected range label behavior anywhere the same cooperative size select pattern is used for tenant onboarding or cooperative profile editing.
- Prefer a small reusable display helper or cooperative-size select wrapper if the same pattern exists in multiple forms. Avoid changing the shared select primitive in a way that could alter unrelated selects unless the primitive is confirmed to be the root cause.
- On value change, continue submitting the configured range value so existing onboarding validation and tenant persistence remain unchanged.
- The onboarding completion response should return a `dashboardUrl` without `/app`.
- The visible Get Started action should use the corrected `dashboardUrl` from the onboarding response.
- The workspace-ready email should use the same corrected `dashboardUrl`, so the screen and email do not disagree.
- Development dashboard URL variants should also be generated without `/app`; local path-style variants may still use the tenant slug path when that is the local routing strategy, but should not append `/app`.
- The public site URL should remain the public tenant site root and should not be conflated with the dashboard URL.
- No database schema, tenant bootstrap data model, member records, or finance workflow should change for this fix.

## Testing Decisions

- Tests should assert external behavior: selected labels shown to users and URLs returned to users. Avoid tests that only lock in internal helper structure.
- The highest useful seam for the cooperative size issue is the onboarding/profile form behavior: selecting `26-100 members` should leave the closed combobox trigger showing `26-100 members`, while submitted form data still carries the configured range value.
- If there is no existing component-test harness for these forms, add the narrowest practical regression around the display helper or wrapper and cover the full flow with browser QA.
- Keep the existing domain tests that verify allowed cooperative size values and labels. Add coverage only if a new helper is introduced.
- The highest existing seam for the dashboard link issue is workspace URL generation. Add or update tests so configured, non-local, production-like, local subdomain, and local path-style origins all produce dashboard URLs without `/app`.
- Add route-level or notification-draft coverage if needed to prove the onboarding response and workspace-ready email consume the corrected dashboard URL.
- Good tests should prove that `dashboardUrl`, development dashboard variants, and workspace-ready email links omit `/app`, while `siteUrl` remains the tenant public site root.
- Regression coverage should include the concrete reported examples: selecting `26-100 members` must not display `100`, and creating a workspace must not produce a dashboard link ending in or containing `/app`.

## Out of Scope

- Changing the stored `currentSize` value from an integer to a string range key.
- Adding new cooperative size ranges or changing existing labels.
- Redesigning the onboarding form layout.
- Changing tenant bootstrap, tenant domain persistence, or dashboard authentication.
- Reworking the overall tenant URL/routing architecture beyond removing `/app` from onboarding completion targets.
- Changing public site URLs, marketing routes, member signup routes, or dashboard internal navigation unrelated to the workspace-created handoff.

## Further Notes

- The user explicitly confirmed that storing `100` for `26-100 members` is acceptable. The problem is the selected combobox input display.
- The user explicitly confirmed that the post-creation dashboard link should not have `/app`.
- These are first-run trust details. They should be handled before broader onboarding changes because they affect the first successful workspace creation moment.
