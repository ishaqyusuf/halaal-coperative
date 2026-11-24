/**
 * 02 Brand native tint pairs for member home icons (tiles, attention rows,
 * services). Class strings are literal so NativeWind can see them.
 */
export type HomeTint = "success" | "warm" | "sky" | "lilac" | "vivid" | "danger"

export const homeTintClasses: Record<HomeTint, { icon: string; surface: string }> = {
  danger: { icon: "text-tint-danger-foreground", surface: "bg-tint-danger" },
  lilac: { icon: "text-tint-lilac-foreground", surface: "bg-tint-lilac" },
  sky: { icon: "text-tint-sky-foreground", surface: "bg-tint-sky" },
  success: { icon: "text-tint-success-foreground", surface: "bg-tint-success" },
  vivid: { icon: "text-tint-vivid-foreground", surface: "bg-tint-vivid" },
  warm: { icon: "text-tint-warm-foreground", surface: "bg-tint-warm" },
}

const statTints: Record<string, { icon: string; tint: HomeTint }> = {
  "approved-not-paid-out": { icon: "Clock", tint: "sky" },
  commitment: { icon: "Wallet", tint: "success" },
  financing: { icon: "HandCoins", tint: "sky" },
  savings: { icon: "WalletCards", tint: "success" },
  "share-capital": { icon: "PieChart", tint: "lilac" },
  "special-savings": { icon: "PiggyBank", tint: "warm" },
}

const serviceTints: Record<string, HomeTint> = {
  commitments: "success",
  financing: "sky",
  foodPurchase: "vivid",
  guarantors: "sky",
  notifications: "warm",
  procurement: "sky",
  projectFinancing: "success",
  receipts: "sky",
  savings: "success",
  shares: "lilac",
  statements: "lilac",
  support: "warm",
  updates: "lilac",
}

export function statTintFor(key: string) {
  return statTints[key] ?? { icon: "Wallet", tint: "success" as const }
}

export function serviceTintFor(key: string): HomeTint {
  return serviceTints[key] ?? "success"
}

export function attentionTintFor(
  severity: "neutral" | "warning" | "critical"
): HomeTint {
  if (severity === "critical") return "danger"
  return severity === "warning" ? "warm" : "sky"
}
