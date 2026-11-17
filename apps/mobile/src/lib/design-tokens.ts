/**
 * The one source of truth for the mobile design system (T00 direction
 * "02 Brand native", Workshop revision af418b19-40a7-44b0-a694-3afc9df3540b).
 *
 * - `palette` feeds `THEME` (lib/theme.ts), `nativewindThemeVars` and the
 *   `:root` blocks in styles/global.css. Run `bun run sync:theme-css` after
 *   editing it; `check:nativewind-theme-vars` fails on any drift.
 * - Keep palette values as literal `rgb()` strings, one per line: the CSS
 *   generator and the drift guard parse this object statically.
 * - Never import app modules here; scripts read this file without bundling.
 */

export const palette = {
  light: {
    background: "rgb(243, 246, 245)",
    foreground: "rgb(17, 24, 20)",
    foregroundSoft: "rgb(52, 67, 61)",
    card: "rgb(255, 255, 255)",
    cardForeground: "rgb(17, 24, 20)",
    popover: "rgb(255, 255, 255)",
    popoverForeground: "rgb(17, 24, 20)",
    surfaceRaised: "rgb(235, 240, 238)",
    surfaceFloat: "rgb(255, 255, 255)",
    segmentedIndicator: "rgb(255, 255, 255)",
    primary: "rgb(15, 118, 110)",
    primaryForeground: "rgb(255, 255, 255)",
    brand: "rgb(13, 148, 136)",
    brandContrast: "rgb(37, 58, 114)",
    brandForeground: "rgb(240, 253, 250)",
    brandSurface: "rgb(5, 92, 80)",
    brandSurfaceForeground: "rgb(240, 253, 250)",
    brandVivid: "rgb(235, 114, 92)",
    brandWarm: "rgb(243, 188, 62)",
    heroStart: "rgb(14, 138, 125)",
    heroMid: "rgb(5, 92, 80)",
    heroEnd: "rgb(3, 63, 55)",
    heroForeground: "rgb(240, 253, 250)",
    heroAccent: "rgb(153, 246, 228)",
    heroMarkForeground: "rgb(59, 42, 6)",
    success: "rgb(21, 128, 61)",
    successForeground: "rgb(240, 253, 244)",
    warn: "rgb(217, 119, 6)",
    warnForeground: "rgb(255, 247, 237)",
    secondary: "rgb(235, 240, 238)",
    secondaryForeground: "rgb(52, 67, 61)",
    muted: "rgb(235, 240, 238)",
    mutedForeground: "rgb(92, 106, 100)",
    accent: "rgb(219, 245, 239)",
    accentForeground: "rgb(13, 94, 82)",
    tintWarm: "rgb(253, 242, 216)",
    tintWarmForeground: "rgb(133, 82, 10)",
    tintVivid: "rgb(253, 232, 227)",
    tintVividForeground: "rgb(162, 59, 38)",
    tintSuccess: "rgb(227, 244, 232)",
    tintSuccessForeground: "rgb(20, 108, 54)",
    tintDanger: "rgb(253, 236, 236)",
    tintDangerForeground: "rgb(155, 28, 28)",
    tintSky: "rgb(227, 238, 251)",
    tintSkyForeground: "rgb(29, 79, 145)",
    tintLilac: "rgb(238, 232, 251)",
    tintLilacForeground: "rgb(91, 58, 168)",
    destructive: "rgb(185, 28, 28)",
    destructiveForeground: "rgb(254, 242, 242)",
    border: "rgb(225, 232, 228)",
    input: "rgb(225, 232, 228)",
    ring: "rgb(15, 118, 110)",
    overlay: "rgba(0, 0, 0, 0.48)",
    radius: "0.875rem",
    chart1: "rgb(13, 148, 136)",
    chart2: "rgb(21, 128, 61)",
    chart3: "rgb(217, 119, 6)",
    chart4: "rgb(31, 41, 55)",
    chart5: "rgb(225, 29, 72)",
  },
  dark: {
    background: "rgb(14, 15, 15)",
    foreground: "rgb(250, 250, 250)",
    foregroundSoft: "rgb(214, 218, 216)",
    card: "rgb(26, 27, 27)",
    cardForeground: "rgb(250, 250, 250)",
    popover: "rgb(36, 38, 38)",
    popoverForeground: "rgb(250, 250, 250)",
    surfaceRaised: "rgb(36, 38, 38)",
    surfaceFloat: "rgb(36, 38, 38)",
    segmentedIndicator: "rgb(53, 56, 55)",
    primary: "rgb(45, 212, 191)",
    primaryForeground: "rgb(4, 47, 46)",
    brand: "rgb(45, 212, 191)",
    brandContrast: "rgb(129, 140, 248)",
    brandForeground: "rgb(4, 47, 46)",
    brandSurface: "rgb(8, 78, 69)",
    brandSurfaceForeground: "rgb(240, 253, 250)",
    brandVivid: "rgb(248, 113, 113)",
    brandWarm: "rgb(251, 191, 36)",
    heroStart: "rgb(11, 107, 97)",
    heroMid: "rgb(8, 78, 69)",
    heroEnd: "rgb(5, 47, 42)",
    heroForeground: "rgb(240, 253, 250)",
    heroAccent: "rgb(153, 246, 228)",
    heroMarkForeground: "rgb(59, 42, 6)",
    success: "rgb(34, 197, 94)",
    successForeground: "rgb(236, 253, 245)",
    warn: "rgb(245, 158, 11)",
    warnForeground: "rgb(255, 251, 235)",
    secondary: "rgb(36, 38, 38)",
    secondaryForeground: "rgb(214, 218, 216)",
    muted: "rgb(36, 38, 38)",
    mutedForeground: "rgb(163, 169, 166)",
    accent: "rgb(24, 61, 55)",
    accentForeground: "rgb(153, 246, 228)",
    tintWarm: "rgb(58, 47, 18)",
    tintWarmForeground: "rgb(252, 211, 77)",
    tintVivid: "rgb(61, 28, 23)",
    tintVividForeground: "rgb(252, 165, 165)",
    tintSuccess: "rgb(19, 50, 34)",
    tintSuccessForeground: "rgb(134, 239, 172)",
    tintDanger: "rgb(59, 23, 23)",
    tintDangerForeground: "rgb(252, 165, 165)",
    tintSky: "rgb(24, 42, 64)",
    tintSkyForeground: "rgb(165, 200, 245)",
    tintLilac: "rgb(42, 33, 64)",
    tintLilacForeground: "rgb(201, 182, 245)",
    destructive: "rgb(220, 38, 38)",
    destructiveForeground: "rgb(254, 242, 242)",
    border: "rgb(47, 49, 48)",
    input: "rgb(47, 49, 48)",
    ring: "rgb(45, 212, 191)",
    overlay: "rgba(0, 0, 0, 0.68)",
    radius: "0.875rem",
    chart1: "rgb(45, 212, 191)",
    chart2: "rgb(34, 197, 94)",
    chart3: "rgb(251, 191, 36)",
    chart4: "rgb(115, 115, 115)",
    chart5: "rgb(244, 63, 94)",
  },
} as const

export type PaletteKey = keyof typeof palette.light
export type ColorScheme = keyof typeof palette

/** Type scale: size / line height / weight, matching the T00 kit. */
export const typeScale = {
  hero: { fontSize: 36, lineHeight: 42, fontWeight: "800", tabular: true },
  screenTitle: { fontSize: 26, lineHeight: 32, fontWeight: "800" },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "800" },
  section: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "500" },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  money: { fontSize: 16, lineHeight: 22, fontWeight: "800", tabular: true },
  button: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
} as const

export const radii = {
  hero: 28,
  card: 20,
  tile: 18,
  input: 14,
  button: 16,
  sheet: 32,
  avatar: 14,
  chip: 999,
  dock: 32,
} as const

export const spacing = {
  gutter: 18,
  block: 16,
  cardPad: 16,
  rowPad: 14,
  rowMin: 64,
  chipGap: 8,
  control: 52,
  tap: 44,
  sheetInset: 8,
  sheetBottom: 46,
} as const

/** Shadows as React Native `boxShadow` strings (RN 0.76+). */
export const shadows = {
  light: {
    card: "0 1px 2px rgba(16, 40, 34, 0.05), 0 10px 24px -14px rgba(16, 40, 34, 0.22)",
    float:
      "0 12px 28px -10px rgba(24, 36, 32, 0.30), 0 2px 6px rgba(24, 36, 32, 0.06)",
    sheet: "0 16px 28px rgba(0, 0, 0, 0.18)",
  },
  dark: {
    card: "none",
    float: "0 14px 30px -8px rgba(0, 0, 0, 0.62)",
    sheet: "0 16px 28px rgba(0, 0, 0, 0.5)",
  },
} as const

/** Motion durations (ms) and cubic-bezier control points. */
export const motion = {
  sheet: { duration: 300, bezier: [0.22, 0.61, 0.36, 1] },
  sheetExpand: { duration: 340, bezier: [0.22, 0.61, 0.36, 1] },
  dockHide: { duration: 200 },
  dockShow: { damping: 26, mass: 0.8, stiffness: 240 },
  keyboard: { duration: 250, bezier: [0.17, 0.59, 0.4, 0.77] },
  statusStrip: { duration: 180 },
  searchFold: { duration: 300, bezier: [0.2, 0.8, 0.2, 1] },
  press: { duration: 120, scale: 0.97 },
} as const

/** Tinted avatar pairs used by RecordRow, cycled by a stable name hash. */
export const avatarTints = [
  { background: "accent", foreground: "accentForeground" },
  { background: "tintWarm", foreground: "tintWarmForeground" },
  { background: "tintSky", foreground: "tintSkyForeground" },
  { background: "tintLilac", foreground: "tintLilacForeground" },
  { background: "tintVivid", foreground: "tintVividForeground" },
] as const satisfies readonly {
  background: PaletteKey
  foreground: PaletteKey
}[]
