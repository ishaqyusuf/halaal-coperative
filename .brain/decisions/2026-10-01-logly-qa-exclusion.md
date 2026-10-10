# Exclude QA users from Logly collection

Status: Implemented in source, 1 October 2026; deployment acceptance pending.

The owner requested QA-user exclusion in EwaTrade and Halaalvest. Halaalvest resolves this from server-authenticated account/session/workspace facts: exact mapped QA email domain, QA-derived session, or QA workspace classification. It does not infer QA from a `qa+` email prefix or trust client-supplied identity metadata.

Represent collection permission separately from optional attribution. An explicit denied result suppresses anonymous as well as attributed analytics. A missing secret is an allowed anonymous result for ordinary users. Browser and mobile capture/delivery paths honor denial, clear pending queues and isolate account transitions. Browser ingest independently suppresses authenticated QA traffic; native public proxies receive no application session credentials.

Keep existing runtime/platform/release enable flags and financial/audit records unchanged. This change applies to optional Logly analytics only. No new database columns, migration, deployment, collection activation or historical-event deletion is required. Already-sent requests cannot be recalled.
