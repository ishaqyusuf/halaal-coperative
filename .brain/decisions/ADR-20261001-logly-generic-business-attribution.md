# Generic Logly business attribution

Status: Implemented in source, 1 October 2026; deployment and live acceptance pending.

The owner requested real business identity using reusable groups rather than a product-specific Logly business column. Halaalvest maps its cooperative tenant to generic `business` groups, with a stable project-scoped HMAC key and mutable name/kind properties. Individual account identity is independent.

The shared events package owns the signed analytics context, capture adapters, metadata projection and proxy verification; app boundaries supply verified host/session or mobile profile input. This follows Midday's shared events package ownership while preserving Halaalvest's fixed-surface proxies and native release constraints.

Browser events use bounded memory queues because the installed Logly 0.2 SDK uses project-shared IndexedDB queues. Attaching current identity at delivery could misattribute another account's pending events. Capturing a signed token per event prevents that; scope changes clear pending data and rotate anonymous identity. This deliberately trades offline persistence for predictable attribution. Browser DNT/GPC and native Android enablement gates remain enforced.

Contexts last one hour; events captured during that interval can be retried for 24 hours. The private `LOGLY_ATTRIBUTION_SECRET` must be consistently provisioned across issuers/proxies before activation; rotation changes identity references. Collector generic-group support is a rollout dependency. No merchant report authorization, UI, deployment, secret activation or database migration is included here.
