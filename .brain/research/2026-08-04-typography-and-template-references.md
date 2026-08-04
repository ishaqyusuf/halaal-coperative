# Readable typography and template references for marketing and dashboard

Research date: 2026-08-04  
Scope: first-party accessibility guidance, official design-system documentation, and official template or UI-kit listings relevant to Halaalvest's public marketing site and cooperative operations dashboard. This is a recommendation only; no product code was changed.

## Executive recommendation

Adopt **one semantic typography system with two modes**:

- an **expressive marketing mode** with fluid display headings, an 18px reading body, a 20px lead, short line lengths, and generous vertical rhythm;
- a **productive dashboard mode** with a 15–16px default UI body, 14–15px table content, 14px labels and metadata, and deliberately larger 24–36px page-title/KPI styles.

Do not enlarge every existing Tailwind utility or set the root font size to 112.5% as the first step. That would also enlarge rem-based spacing, controls, sidebars, tables, and dialogs without deciding which information deserves emphasis. Instead, define semantic roles, migrate the shared primitives first, and audit every remaining 12px use. Carbon's official typography guidance supports this two-mode model: it separates **expressive** web/editorial type from denser **productive** product type, and warns that expressive styles can distract inside task-focused product interfaces ([Carbon typography overview](https://carbondesignsystem.com/elements/typography/overview/), [Carbon style strategies](https://carbondesignsystem.com/elements/typography/style-strategies/)).

The strongest visual direction is a combination, not one wholesale template:

1. use **Wise Design / Wise Platform** as the visual model for bold, expressive public moments paired with restrained, highly legible financial operations UI;
2. use **Tailwind Oatmeal** as the marketing composition reference;
3. use **shadcn Dashboard 01** as the open-source structural baseline because Halaalvest already standardizes on shadcn;
4. borrow **Catalyst's** hierarchy and component finish for tables, forms, descriptions, sidebars, and settings;
5. borrow only the credible, nature-led visual cues from **FintechX**, not its investment/trading positioning.

This combination preserves Halaalvest's “Organic Trust” identity while making cooperative money, approvals, balances, risks, and member records easier to read.

## Current Halaalvest signal

A lightweight repository scan confirms that the readability concern is primarily a product-UI density problem:

- `apps/marketing/app/readability.css` already sets the marketing root to 1rem with a 1.65 line height, but the eyebrow is 0.75rem/12px, form fields are 0.95rem, and many section components still use small utilities.
- A lexical scan of `apps/dashboard/src` found **496 `text-xs` occurrences**, **627 `text-sm` occurrences**, and only **33 `text-base` occurrences**. Tailwind's defaults map those utilities to 12px, 14px, and 16px respectively ([Tailwind font-size reference](https://tailwindcss.com/docs/font-size)). Counts include tests, repeated responsive variants, and some legitimate metadata, so they are a directional signal rather than a component audit.
- Several visible dashboard examples use `text-xs` for KPI labels, explanatory text, form labels, status details, and risk buckets. Those uses are more consequential than a small timestamp or tertiary badge.

The implication is not “remove all 12px text.” It is: **make 12px exceptional, never the normal way a user learns, decides, verifies a financial amount, or completes a form.**

## Five quality references

Scores are out of 10. “Overall” weighs visual/typographic fit, applicability across Halaalvest's two surfaces, implementation compatibility, accessibility posture, and ability to support a distinctive cooperative trust brand. A reference can score highly overall without covering both surfaces because the recommended solution intentionally combines complementary references.

| Reference | Marketing fit | Dashboard fit | Overall | Why it is relevant |
|---|---:|---:|---:|---|
| [Wise Design typography](https://wise.design/foundations/typography) + [Wise Platform](https://wise.design/resources/wise-platform) | 9.4 | 9.1 | **9.5** | Best end-to-end visual direction. Wise defaults to legible Inter for functional/product content, reserves its expressive face for short moments, and deliberately restrains type and color for its bank/enterprise platform. It proves that warm, bold marketing and calm financial operations can share one identity. It is a reference, not a reusable template. |
| [Tailwind Oatmeal SaaS marketing kit](https://tailwindcss.com/plus/kits/oatmeal?theme=mauve_familjen) | 9.6 | 5.5 | **9.1** | Best public-site direction. Official Tailwind kit with 50+ components, 30+ prebuilt sections, multiple palettes/font pairings, and accessible/responsive combinations. Its calm, editorial, modular character is a better match for “Organic Trust” than loud fintech gradients. |
| [shadcn Dashboard 01](https://ui.shadcn.com/blocks?category=dashboard) | 5.5 | 9.6 | **9.0** | Best structural dashboard baseline and lowest integration risk. It combines a sidebar, header, metric sections, chart, and data table in an open-source block aligned with Halaalvest's required component system. It is a baseline to enlarge and simplify, not a finished brand. |
| [Tailwind Catalyst application UI kit](https://tailwindcss.com/plus/ui-kit) | 6.0 | 9.4 | **8.8** | Best polished product reference. Official React/Tailwind kit covers text, headings, tables, forms, description lists, pagination, dialogs, auth, and application shells. Strong model for consistent component-level type roles and accessible interactions. Commercial license required for code reuse. |
| [FintechX finance SaaS template on Framer Marketplace](https://www.framer.com/marketplace/templates/fintechx/) | 8.8 | 6.4 | **8.3** | Best mood-board match for a nature-inspired, light, trustworthy financial product with a dashboard preview, security proof, social proof, and clear buyer journey. Use as a visual reference only: avoid its wealth, trading, and investment-platform language because Halaalvest is cooperative operations software, not a direct lender or trading platform. |

### Patterns to borrow from each

#### 1. Wise Design and Wise Platform: one identity, two levels of expression

- Wise's official system says to default to Inter because it is legible in headings and body copy, especially in product, and to reserve its display face for short expressive moments.
- It recommends 50–60-character line lengths, left or contextually appropriate alignment, no justified paragraphs, and warns against all-caps Inter.
- Wise Platform deliberately reins in the consumer brand's high-impact type, uses Inter more often for informative moments, and limits secondary colors to small contained areas for a bank/enterprise audience.
- The result is the closest high-quality precedent for Halaalvest: expressive public storytelling without turning operational finance screens into campaign art.

Borrow the separation of expressive and functional moments, the restrained enterprise palette, and short reading measures. Do not copy Wise's proprietary font or distinctive brand assets.

#### 2. Oatmeal: public reading comfort and modular individuality

- Fluid, prominent display type with restrained supporting copy.
- Calm backgrounds, limited palette, and editorial whitespace rather than decorative card overload.
- A section library that can be recomposed so Halaalvest does not look like an unchanged template.
- Larger type paired with shorter measures, rather than merely occupying more horizontal space.
- Font pairing used selectively: a distinctive display face for campaign headings, a highly legible sans for body, forms, navigation, pricing, and product screenshots.

Oatmeal is the recommended marketing anchor. Halaalvest should preserve the current serif/sans personality only where the serif improves brand expression; it should not enter tables, financial amounts, form controls, or dashboard navigation.

#### 3. shadcn Dashboard 01: familiar information architecture

- Clear separation of global navigation, page header, metrics, trend visualization, and table work.
- Reusable block ownership instead of page-specific typography.
- Container-responsive composition that can stack or simplify without shrinking text.
- A realistic starting point for Halaalvest's exception-led overview: deployable funds, collection coverage, portfolio at risk, and action queue.

The stock block is still visually dense. Borrow its anatomy and component boundaries, then apply the Halaalvest productive scale below.

#### 4. Catalyst: component-level hierarchy and finish

- Consistent relationships among `Heading`, `Text`, `Fieldset`, `Table`, `DescriptionList`, `Badge`, sidebar, and auth layouts.
- Controls that remain visually calm while labels and values are distinguishable.
- Description lists as an especially strong pattern for cooperative profiles, approval evidence, finance policy, member details, and audit context.
- Flat divisions and alignment rather than deeply nested cards.

Catalyst is the most useful paid reference for the dashboard, but should not replace shadcn source components. Use it to evaluate Halaalvest wrappers and semantic type roles.

#### 5. FintechX: credible nature-led finance mood

- A light, nature-inspired visual language that is close to the approved Organic Trust direction.
- Large financial typography, proof points, security messaging, persona-based explanation, and dashboard preview.
- Strong immediate trust impression without defaulting to a generic dark “enterprise” interface.

Borrow the palette mood, type confidence, and trust architecture. Replace investment/trading conventions with cooperative evidence: transparent charges, auditable approvals, interest-free financing, pool liquidity, statements, and member-owned operations.

## Proposed type scale

These are recommended design targets, not WCAG-mandated minimum font sizes. WCAG does not prescribe a universal minimum body size; it requires that text can scale and remain usable. The sizes below are grounded in official product systems: Atlassian uses 16/24 for long-form body, 14/20 for component body, 12/16 only for sparse secondary content, and 24–28px metric styles ([Atlassian typography](https://atlassian.design/foundations/typography/)). Carbon's base scale likewise includes 12, 14, 16, 18, 20, 24, 28, and 32px steps ([Carbon typography](https://carbondesignsystem.com/elements/typography/overview/)).

### Marketing scale

| Semantic role | Mobile target | Desktop target | Line height | Use |
|---|---:|---:|---:|---|
| Display / hero | 46–52px | 68–80px | 0.98–1.08 | One short outcome-led statement; cap at roughly 10–12 words per visible line. |
| Page title | 40–44px | 52–64px | 1.04–1.12 | Pricing, use-case, migration, security, and resource pages. |
| Section heading | 32–36px | 42–48px | 1.08–1.16 | Major homepage narrative sections. |
| Card/feature heading | 22–24px | 24–28px | 1.2–1.3 | Feature group titles and trust principles. |
| Lead paragraph | 20px | 20–22px | 1.45–1.55 | Hero support and section introductions. |
| Reading body | 18px | 18px | 1.55–1.7 | Benefits, explanations, FAQs, migration/trust copy. |
| Supporting body | 16px | 16px | 1.5–1.6 | Short captions, plan details, compact proof notes. |
| Navigation/button | 15–16px | 15–16px | 1.25–1.4 | Persistent or actionable text; use medium weight. |
| Eyebrow/metadata | 13–14px | 13–14px | 1.35–1.5 | Short section label only; avoid long uppercase strings and excessive tracking. |

Only headings should scale fluidly across viewports. Keep body and controls at their readable floor on small screens; do not use a `vw` value that makes mobile text smaller. CSS `clamp()` can set minimum, preferred, and maximum bounds, but MDN warns that font scaling must still support 200% enlargement and recommends relative bounds ([MDN `clamp()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp)).

### Dashboard scale

| Semantic role | Target | Line height | Use |
|---|---:|---:|---|
| Page title | 26–30px | 32–38px | Workspace identity and the current task; not repeated inside every card. |
| Primary KPI | 30–36px | 34–40px | Deployable funds, collection coverage, portfolio at risk, action total. Use tabular numerals. |
| Secondary metric | 22–26px | 28–32px | Supporting totals and ratios. |
| Section heading | 18–20px | 26–28px | Action queue, contribution health, risk, compliance, activity. |
| Component/card title | 16–18px | 24–26px | Table groups, sheets, panels, dialogs. |
| Default UI/body | 16px preferred; 15px minimum | 22–24px | Descriptions, alerts, review evidence, member and finance context. |
| Form label | 14–15px | 20px | Every input label; medium weight and high contrast. |
| Form input/value | 16px | 24px | Input content and selected values, especially on mobile. |
| Table primary cell | 15px | 20–22px | Member names, financial amounts, main status/decision field. |
| Table secondary cell | 14px | 20px | Dates, references, source, secondary status context. |
| Button/navigation | 14–15px | 20px | Medium weight; target size comes from padding, not tiny text. |
| Caption/tertiary metadata | 13px | 18px | Timestamps, compact badge support, nonessential metadata. |
| Exceptional microcopy | 12px | 16–18px | Rare legal/code-like metadata only; never instructions, errors, money explanations, or primary labels. |

For finance amounts, use a sans face with clear digit shapes, `font-variant-numeric: tabular-nums`, and consistent right alignment in comparable table columns. Never rely on type size or color alone to distinguish available funds, commitments, overdue values, charges, and posted balances; keep explicit labels and state language.

## Readability rules beyond size

### Line length and vertical rhythm

USWDS recommends 45–90 characters per line for most text and identifies roughly 66 characters as a strong long-text target. It also recommends at least 1.5 line height for longer text, while headings of one or two lines can use approximately 1.0–1.35 ([USWDS typography](https://designsystem.digital.gov/components/typography/)). For Halaalvest:

- marketing paragraphs: target 55–70 characters, with 66ch as the default maximum;
- form descriptions and dashboard empty states: 45–60 characters;
- page introductions: 50–65 characters;
- table cells: prefer one concise line, but reveal the full value on focus/activation when truncation is necessary;
- do not stretch body text across the full width merely because the font is larger.

### Contrast and weight

- Normal text must reach at least 4.5:1 contrast; large text can use 3:1 under WCAG's definition. Aim above the minimum for 13–15px muted copy because cooperative finance work often happens on average screens and in bright environments ([W3C contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
- Use regular 400 for paragraphs, medium 500 for controls/labels, and semibold 600 for headings. Avoid light weights in the dashboard and do not solve hierarchy by making every small label bold.
- Keep running text neutral. Reserve green, amber, and red for actions and states with text/icon support, not decoration. Carbon makes the same distinction between neutral running copy and purposeful action/state color ([Carbon typography](https://carbondesignsystem.com/elements/typography/overview/)).

### Relative units and zoom

- Keep the browser root at 100% and express semantic tokens in `rem`. MDN recommends relative sizes because they respect user defaults and avoid the compounding behavior of nested `em` rules ([MDN `font-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-size)).
- Verify every marketing and dashboard route at 200% browser zoom with no clipped labels, controls, dialogs, charts, or table actions. WCAG 2.2 requires text to resize to 200% without loss of content or function ([W3C Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text)).
- Verify non-tabular page content at the equivalent of a 320 CSS-pixel viewport/400% zoom. Data tables may use their own two-dimensional scrolling region, but the page around the table must reflow independently ([W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).
- Ensure layouts tolerate user-overridden text spacing without clipping: 1.5x line height, 2x paragraph spacing, 0.12em letter spacing, and 0.16em word spacing are the WCAG 1.4.12 test conditions, not a prescription to set those values by default ([W3C Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)).

### Density without shrinking

Dashboard density should come from progressive disclosure, column priority, grouping, and responsive layout—not 12px text everywhere.

- At desktop widths, preserve 48–52px table row targets for the normal readable mode; provide compact spacing only as an optional density preference.
- On mobile and at high zoom, turn nonessential columns into row details, sheets, or an alternate list view. Do not shrink every cell to keep all columns visible.
- Keep action queues and exception rows visually dominant; use 14–16px supporting text with restrained spacing rather than numerous small cards.
- Hide or demote secondary analytics on narrow screens before reducing the type scale.

## Recommended Halaalvest direction

### Public marketing

- Preserve the Organic Trust palette and editorial character.
- Move the reading body to 18px, lead copy to 20–22px, and section headings to a controlled 32–48px fluid range.
- Increase the size of dashboard screenshots/product demonstrations so their text is meaningful; do not render an illegible full dashboard as decoration.
- Keep pricing, security/trust, migration, and FAQ content at a 16–18px floor.
- Replace 12px uppercase/tracked eyebrow treatment with a 13–14px short label or a small sentence-case kicker.

### Dashboard

- Make 16px the default for explanations, alerts, review evidence, form values, and high-consequence copy.
- Promote most visible `text-xs` labels/helper/error text to 14px and most primary `text-sm` table/form content to 15–16px by semantic role.
- Keep tables efficient with 15px primary cells and 14px secondary cells; use 13px only for tertiary timestamps or IDs.
- Raise KPI labels from 12px to 14px and primary values from 24px to 30–36px, while preserving explicit definitions and conservative finance labels.
- Treat forms and approval sheets as reading surfaces: 14–15px labels, 16px values, 14–16px helper/error text, and 22–24px form titles.
- Add a future user preference with `Comfortable` and `Compact` density plus `Default` and `Large text` scaling. Density should primarily change padding/row height; text scaling should be independently testable. Browser zoom must remain fully supported regardless of preferences.

## Suggested rollout, when implementation is approved

1. **Inventory by semantic role.** Map every marketing and dashboard text use to display, heading, body, label, control, table primary, table secondary, metric, caption, or code. Flag 12px content that affects money, eligibility, approvals, errors, or task completion.
2. **Define shared tokens, not global utility overrides.** Introduce expressive and productive token aliases in the shared theme. Preserve Tailwind's underlying utility meanings so third-party/shadcn behavior remains predictable.
3. **Prototype representative routes.** Marketing home/pricing/signup; dashboard overview, one dense finance table, one member table, one long form, one approval sheet, and one member-facing statement.
4. **Validate hierarchy with real data.** Include long cooperative/member names, large naira values, overdue states, translated/verbose labels, empty states, errors, and permission-restricted views.
5. **Migrate shared primitives first.** Page shell, headings, text, form labels/descriptions/errors, inputs/selects, buttons, badges, table cells, metric tiles, sheets/dialogs, sidebar, and breadcrumbs.
6. **Migrate by risk.** Overview and action queues first, then finance/repayment/contribution/member workflows, then lower-risk settings and admin metadata.
7. **Run accessibility QA.** 200% text/zoom, 320 CSS-pixel reflow, text-spacing override, keyboard focus, contrast, screen-reader heading order, mobile 360/390, tablet 768, and representative desktop widths.
8. **Measure the result.** Track form errors, task completion time, support comments about readability, zoom usage if privacy-safe, and whether operators can identify the highest-risk action without opening several panels.

## Decision summary

- **Recommended reference stack:** Wise Design/Wise Platform for the cross-surface visual principle, Oatmeal for marketing composition, and shadcn Dashboard 01/Catalyst for product structure and component hierarchy.
- **Recommended public base:** 18px reading body, 20–22px lead, 16px supporting/action floor.
- **Recommended product base:** 16px primary UI body, 15px primary table text, 14px labels/secondary table text, 13px tertiary metadata.
- **Recommended exception:** 12px only for genuinely tertiary/legal/code-like content; never for finance explanations, form errors, important labels, or action-driving information.
- **Recommended implementation strategy:** semantic two-mode tokens and risk-ordered component migration, followed by zoom/reflow QA—not a blanket root-font enlargement.

## Primary sources

- [W3C WCAG 2.2: Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text)
- [W3C WCAG 2.2: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [W3C WCAG 2.2: Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)
- [W3C WCAG 2.2: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [U.S. Web Design System typography](https://designsystem.digital.gov/components/typography/)
- [Atlassian Design System typography](https://atlassian.design/foundations/typography/)
- [Carbon Design System typography](https://carbondesignsystem.com/elements/typography/overview/)
- [Carbon productive and expressive strategies](https://carbondesignsystem.com/elements/typography/style-strategies/)
- [MDN `font-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-size)
- [MDN `clamp()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp)
- [Tailwind CSS font-size scale](https://tailwindcss.com/docs/font-size)
- [Wise Design typography](https://wise.design/foundations/typography)
- [Wise Platform visual guidance](https://wise.design/resources/wise-platform)
- [Tailwind Oatmeal](https://tailwindcss.com/plus/kits/oatmeal?theme=mauve_familjen)
- [Tailwind Catalyst](https://tailwindcss.com/plus/ui-kit)
- [shadcn dashboard blocks](https://ui.shadcn.com/blocks?category=dashboard)
- [Framer Marketplace: FintechX](https://www.framer.com/marketplace/templates/fintechx/)
