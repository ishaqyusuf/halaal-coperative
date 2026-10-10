# Dashboard mobile filter sheets

Owner selection: option 02, expandable groups. [Architecture decision](../decisions/ADR-20261006-mobile-filter-sheets.md).

## Behavior and ownership

- `components/search-filter/mobile-filter-drawer.tsx` owns the Base UI modal, scrollable body, fixed safe-area Reset/Apply footer, async Apply state/error, and focus return.
- `mobile-filter-group.tsx` owns accessible category disclosures and a sheet-local single expanded-group context. Callers supply selection labels from authoritative filter options, never fabricated result counts.
- `mobile-search-filter.tsx` snapshots only supplied filter keys; commits only currently supplied keys; supports scalar, array-parser multi-select, date and date-range fields. Search is excluded by the shared panel and left intact by URL patches.
- Domain drawers remain responsible for their typed values, available options, permission/view-dependent controls, sort defaults, and URL hooks. They mount only while open. Reset updates local state only; Apply waits for existing URL setters; dismissal writes nothing.
- The desktop member search Escape shortcut is disabled below `md`, because that component remains mounted inside a hidden desktop header. Mobile dismissal therefore preserves search; the desktop shortcut is unchanged.
- The shared search panel switches at `<768px`; its desktop inline panel is retained. Share-rule and charge compatibility triggers switch between mobile sheets and their existing desktop menus. Other operational workspaces retain their existing dedicated desktop/mobile toolbar split.
- Buttons/selection rows have 44px mobile targets. Date presets stack into two columns above a compact seven-day calendar at 320px. Long options and calendar content scroll without moving the footer. Base UI handles background isolation, Tab/Shift+Tab containment, Escape/backdrop/close, focus return, and document scroll locking. Reduced-motion transitions are disabled on sheet and backdrop.

## Coverage

Member registry; membership approvals; contributions; repayment collections/schedule/history; loan requests/portfolio; charge definitions; businesses; import batch histories; share requests; payment receipts; support (staff/member); food purchase; procurement; project financing; audit history; notification history; reports; share rules. The charge-header compatibility component also supports the mobile sheet.

Search-only role settings, member-autocomplete fields inside forms, month/year navigation, view tabs, column visibility, global command search, and marketing search are not list-filter groups and retain their existing semantics. Expo uses native feature controls rather than web breakpoint/URL hooks and is outside this responsive dashboard composition.

## Validation boundaries

The isolated fixture mounts the actual shared panel, fields, member drawer, support drawer, and share-rule menu with synthetic options and normal nuqs URL adapters. It is not a substitute for authenticated route, server filtering, loading/denied state, or pagination acceptance. Those server/query boundaries are unchanged. See the [task evidence](../tasks/2026-10-06-mobile-filter-sheets.md).
