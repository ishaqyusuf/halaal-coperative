# Mobile UI Template Direction

## Purpose
- Capture the selected visual template direction for the Halaalvest white-label mobile app.
- Translate the supplied mobile video reference into Halaal cooperative product screens.
- Keep the design useful for member trust, admin actionability, and Halaal finance clarity.

## Source Reference
- User-provided video: `/Users/M1PRO/Downloads/WhatsApp Video 2026-07-02 at 19.51.29.mp4`
- Observed shape: vertical mobile app recording with Nusuk-style screens, including login, create account, profile form, home, menu sheet, wallet/profile activation, service grids, search, and bottom navigation.

## Template Character
The app should borrow the reference's structure and atmosphere, not its brand.

- Warm, calm, trust-focused surfaces.
- Soft sand or ivory page background.
- White elevated sheets and panels.
- Black primary call-to-action buttons.
- Gold accent for active navigation, highlights, and premium trust moments.
- Compact icon grids for service discovery.
- Bottom tab navigation with clear icon labels.
- Rounded bottom sheets for menus, search, role switching, and quick actions.
- Profile-completion prompts that feel useful rather than punitive.
- Form screens with simple section cards, clear inline validation, and sticky submit actions.

## Halaalvest Adaptation

### Auth
- Use a branded warm background with the cooperative logo centered above a white bottom sheet.
- Login sheet includes email/phone, password, forgot password, and tenant/cooperative selector when needed.
- Create-account form follows the reference's clean stacked inputs, but member signup copy must explain admin approval and tenant policy.
- Keep validation visible and specific.

### Member Home
- Replace the reference wallet activation prompt with a member readiness panel:
  - Complete KYC.
  - Review monthly commitment.
  - Link/share member ID.
  - Request financing when eligible.
- Replace service grids with cooperative modules:
  - Commitments.
  - Savings.
  - Financing.
  - Shares.
  - Statements.
  - Documents.
  - Notifications.
  - Support.
- Use a member card pattern for member number, status, tenant name, and optional QR/statement access.
- Use soft dashboard panels for savings, active commitment, current financing, and share position.

### Admin Home
- Keep the same warm/mobile shell but make the first screen exception-led:
  - Deployable funds.
  - Collection coverage.
  - Portfolio at risk.
  - Action queue.
  - KYC/compliance watch.
- Use compact list rows for pending approvals, financing requests, overdue follow-ups, failed imports, and setup warnings.
- Avoid decorative cards that hide operational urgency.

### Menu And More
- Use a rounded bottom sheet or full-height menu sheet similar to the reference.
- Group actions into clear sections:
  - Member services.
  - Finance.
  - Reports.
  - Settings.
  - Support.
- For users with both member and admin access, include a role/workspace switcher near the top.

### Forms
- Use sectioned forms with white cards on warm background.
- Keep financial forms review-first:
  - Show amount.
  - Show eligibility basis.
  - Show estimated monthly servicing.
  - Show policy notes.
  - Require confirmation before submit.
- Do not use interest, rate, compounding, or penalty language.

## Design Tokens

### Color Direction
- App background: warm ivory or sand, for example `#F7F1E6`.
- Surface: near white, for example `#FFFDF8`.
- Text primary: near black, for example `#161411`.
- Text muted: warm gray, for example `#746E64`.
- Primary action: near black, for example `#111111`.
- Accent: warm gold, for example `#D8A94D`.
- Success: deep green, for example `#147A5C`.
- Warning: amber, for example `#C8841D`.
- Error: clear red, for example `#C73E3A`.
- Border: low-contrast warm neutral, for example `#E6DED0`.

Tenant branding can override accent and logo, but financial semantic colors should stay consistent enough for trust and accessibility.

### Shape
- Data cards and repeated list items should stay close to 8px radius for operational clarity.
- Hero panels, bottom sheets, and profile prompts may use larger 20px to 28px radii to match the supplied template.
- Icon tiles should use 12px to 16px radii with stable square dimensions.

### Typography
- Use a clean humanist sans font with strong small-size readability.
- Recommended mobile hierarchy:
  - Screen title: 22px to 24px, 700.
  - Section title: 16px to 18px, 600.
  - Body: 14px to 16px, 400 or 500.
  - Labels: 11px to 12px, 600.
  - Money values: 20px to 28px depending on hierarchy.
- Letter spacing should remain normal for readability.

### Layout
- Mobile-first single column.
- 16px page gutters.
- 8px base spacing scale.
- Fixed-height icon tiles to prevent layout shift.
- Sticky footer actions on long forms.
- Bottom tab bar with 5 or fewer primary destinations.

## Core Mobile Screens To Design First
1. Login bottom sheet.
2. Member home.
3. Member commitment/savings detail.
4. Financing request wizard.
5. Member profile/KYC readiness.
6. Admin work dashboard.
7. Admin approvals queue.
8. More/menu sheet with role switcher.

## Component Inventory
- App shell.
- Auth bottom sheet.
- Tenant logo mark.
- Member readiness panel.
- Financial metric panel.
- Icon service tile.
- Status badge.
- Member card with QR slot.
- Activity row.
- Approval queue row.
- Financing request card.
- Review confirmation sheet.
- Bottom navigation.
- Menu sheet.
- Search sheet.
- Sticky form footer.
- Empty, loading, stale-data, offline, and permission-denied states.

## Guardrails
- The app must not look like a religious travel app; use the reference for layout language only.
- Do not copy Nusuk labels, brand marks, icons, or imagery.
- Keep cooperative money explanations visible.
- Keep admin dashboards exception-led.
- Keep member balances distinct: savings, share capital, financing principal, charges, repayments, and profit allocation.
- Use accessible contrast for all text and controls.
- Preserve tenant isolation and role boundaries in every screen.
- NativeWind semantic theme classes and built-in palette utilities must enter Metro through `withNativewind(config, { input: "./src/styles/global.css" })` and resolve variables through the app root `VariableContextProvider`, with the active light/dark semantic token map from `THEME` plus RN-safe Tailwind stock palette variables such as `--color-red-500`. Do not rely on a `vars()` style object on a plain React Native wrapper for root theme tokens, because token classes can compile correctly but resolve as missing variables at runtime.

## Open Design Questions
- Confirm whether the shared Halaalvest brand should keep black/gold as the default app theme.
- Confirm whether each cooperative can override the accent color at runtime.
- Confirm whether the first mobile build should focus on member self-service screens before admin screens.
- Confirm whether member QR/member card is useful for the cooperative's real-world workflows.
