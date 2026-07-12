# 01 - Persist Tenant Operation Profile Defaults

**What to build:** Every tenant can have a durable Operation Profile with service access modes, typed service policy caps, conservative defaults, audit-ready metadata, and a shared read model that other workflows can use.

**Blocked by:** None - can start immediately.

**Status:** done

- [x] New tenants receive conservative Operation Profile defaults for payment receipts, procurement, Foodstuff Purchase, support, collection sources, and batch posting.
- [x] Service access modes support `disabled`, `office_only`, `member_self_service`, and `read_only`.
- [x] Procurement and Foodstuff Purchase active obligation caps are stored as typed policy values.
- [x] Foodstuff Purchase open-cycle requirement is stored as a typed policy value.
- [x] A shared tenant operation profile read model returns service settings plus derived staff/member create, view, settlement, and navigation decisions.
- [x] Operation Profile reads are tenant-scoped and have tests covering defaults and derived permissions.
