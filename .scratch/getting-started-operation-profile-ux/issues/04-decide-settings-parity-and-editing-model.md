# Decide Settings Parity And Editing Model

Type: grilling
Status: open
Blocked by: 02, 03

## Question

How much of the guided Operation Profile UX should also apply later in Settings?

Resolve:

- Whether Settings should reuse the same sub-step editor, use a compact all-services table, or offer both summary and guided edit modes.
- How admins should revisit one service without stepping through the full wizard.
- How change reasons should appear when reducing access.
- How existing records/read-only states should be explained after setup.
- Whether Settings needs motion or should stay quieter and denser.

The answer should decide the Settings editing model and any component reuse requirement for implementation.

## Comments

Recommendation: Getting Started should use the guided sub-step wizard, while Settings should be quieter and more direct. Settings can show a compact summary list of all services with an "Edit" action per service, opening the same focused service editor pattern without forcing admins through the whole wizard.

Use the same option labels and helper copy in both places. Keep change reason visible only when reducing access or disabling a service. Settings does not need the same motion treatment; it should prioritize scanning, editing one service, and audit clarity.
