# 09 - Add Collection Source To Member Setup And Editing

**What to build:** Staff can assign a member's Collection Source separately from member type during creation and editing, supporting mixed ministry, employer, transfer, cash, and manual members.

**Blocked by:** 01 - Persist Tenant Operation Profile Defaults.

**Status:** completed

- [x] Member create and edit flows expose Collection Source when collection sources are enabled.
- [x] Member type remains separate from collection source.
- [x] Staff can leave Collection Source empty for manual or self-employed payers.
- [x] Staff can assign active ministry, employer, transfer, cash, manual, or other configured sources.
- [x] Collection Source changes are tenant-scoped and auditable where member profile changes are audited.
- [x] Tests cover member creation/editing with and without collection sources.
