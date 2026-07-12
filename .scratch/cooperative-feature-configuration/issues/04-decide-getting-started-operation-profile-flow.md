# Decide Getting Started Operation Profile Flow

Type: prototype
Status: open
Blocked by: 01, 03

## Question

How should Getting Started ask a cooperative how it operates?

Prototype the operator flow for an Operation Profile step that explains each configurable service and collects the required choices before live operation. Include:

- Service descriptions in plain cooperative language.
- Enable/disable controls.
- Sub-configuration revealed only when a service is enabled.
- How share configuration, migration setup mode, member signup/member self-service access, procurement, Foodstuff Purchase, and commitment collection fit together without making the first screen feel overloaded.
- How admins revisit these choices later from settings.

The answer should link the prototype artifact and decide the recommended flow structure. Do not implement production UI.

## Comments

- Flow recommendation: add a new early Getting Started step called **Operation Profile** immediately after **Choose the setup mode** and before detailed finance setup. The plain-language question is: "How does this cooperative operate?"
- Recommended sequence: first keep the existing `Historical backfill` vs `Brought forward` setup-mode choice, because it decides how much old data the cooperative must enter. Second, show the Operation Profile checklist grouped into small sections instead of one overloaded form. Third, let later detailed setup steps adapt based on the selected profile.
- Operation Profile sections: commitments and savings are always on, but ask how commitments are collected: manual/admin posting, member receipt upload, deduction source/payroll batch, or mixed. Shares are always configured and should link into the existing share model setup: monthly history or unit-based shares. Member payment receipts choose `office_only` or `member_self_service`, with disabled only if the cooperative does not want receipt tracking yet. Procurement chooses disabled, office-only, member self-service, or read-only; if enabled, reveal max active obligations, max payback months, active-financing overlap, and commitment-reduction policy. Foodstuff Purchase chooses disabled, office-only, member self-service, or read-only; if enabled, reveal open-cycle requirement, max active obligations, max payback months, and commitment-reduction policy. Deduction/collection sources ask whether some members pay through ministry/employer/payroll; if yes, later show source import/setup and member assignment. Support cases default on, with member access enabled when member accounts are enabled.
- UX recommendation: use compact service rows with a short description, an access-mode segmented control, and a "Configure" disclosure. Do not show every sub-field at once. Use "Recommended" defaults based on setup mode and existing data. If a service has existing records, show it as read-only or office-only by default and explain that existing obligations remain visible. Avoid marketing copy; the page should feel like an operational setup checklist for finance officers.
- Settings location recommendation: after Getting Started, admins should revisit this from **Settings -> Cooperative Profile -> Operation Profile** rather than hiding it under only finance setup, because this is broader than finance policy and controls how the cooperative operates. Finance policy details can still live under Finance Setup.
- Suggested prototype artifact if this ticket is later expanded visually: `.scratch/cooperative-feature-configuration/prototypes/operation-profile-flow.md`.
