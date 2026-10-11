# Domain-only entry for non-Production QA

Status: accepted, 11 October 2026.

The user requested removal of tester credentials from QA entry. Current Mobile, Dashboard and Marketing now submit only QA domain and existing client metadata. This supersedes the manual credential-entry requirement of the earlier QA accelerator design.

An enabled non-Production API accepts exact normalized domains from `EMAIL_QA_DOMAIN_ROUTES` only, requires a signing secret of at least 32 characters and eligible active QA profiles, then creates a system-issued receipt using existing authorization storage. Human issuer is nullable for these receipts. Existing client-bound authorization, rate limits, expiry, revocation, ordinary session issuance and tenant/role checks remain in force. Legacy credential APIs are retained during rollout.

Anyone who knows an enabled QA domain can enter eligible QA identities for that domain. This is an intentional QA convenience, never a Production login path. No tester secret is embedded in any client. Hosted activation requires the generated nullable-issuer migration and explicit server configuration.
