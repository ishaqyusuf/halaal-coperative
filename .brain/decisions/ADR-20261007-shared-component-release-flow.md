# ADR: Follow GND/EwaTrade Shared Component Release Flow

- Status: Accepted
- Date: 2026-10-07
- Supersedes: ADR-20260925-release-assurance-provider-evidence-boundary.md

## Context

The owner requested the current GND and EwaTrade release direction, complete source implementation and an ENV/provider creation handoff before any first release. Both reference repositories now delegate `bun release` to the sibling local-infra-kit release engine through `release.config.ts`; neither uses the former vendored signed-evidence gate.

## Decision

Use that same shared engine directly. Declare HalaalVest's schema-first database, Git-connected Dashboard/API and Marketing, Trigger jobs and fingerprint-driven Android/iOS components. Keep main/preview branches and per-component release tags. Remove the superseded `.release` toolkit, manifest, local legacy commands and verification workflow rather than maintaining competing release gates.

Use a separate Trigger Preview project with its own hosted prod runtime key. Selected files own runtime credentials; CLI deployment authenticates through TRIGGER_ACCESS_TOKEN. Supply nonreserved generated project identity to hosted config, where user-defined TRIGGER_* values can be unavailable. Keep Production project ownership pinned.

Use Expo fingerprint runtime policy, shared account authentication for planner reads, isolated authentication for effects, explicit EAS environments and clean exact-commit commands. Metadata preparation is separate from publication. Preview service targets are explicit and cannot use known Production service hosts. Retain HalaalVest's existing legal/source/artifact/iOS identity requirements and separate store submission.

## Consequences

The sibling toolkit is now a runtime dependency, matching the references; reference toolkit updates affect this repository without a vendored checksum gate. A successful component advances its environment's release tag; this flow does not offer the previous signed collector/live-state assurance. Environment audit compares names, not secret values. Existing application readiness and financial safeguards still apply.

Implementation and offline validation are complete. Provider creation/ENV setup and the first live release remain explicit follow-up work; no hosted effect was executed for this change.
