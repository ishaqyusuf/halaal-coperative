export const memberStats = [
  { label: "Commitment", value: "₦240k", detail: "72% funded" },
  { label: "Savings total", value: "₦860k", detail: "Posted savings" },
  { label: "Special savings", value: "₦45k", detail: "Voluntary savings" },
  {
    label: "Financing exposure",
    value: "₦120k",
    detail: "Next payment Jul 15",
  },
  { label: "Share capital", value: "₦75k", detail: "Ownership position" },
] as const

export const memberServices = [
  { icon: "BadgeCheck", label: "Commitments", tone: "accent" },
  { icon: "HandCoins", label: "Financing", tone: "primary" },
  { icon: "PieChart", label: "Shares", tone: "accent" },
  { icon: "ReceiptText", label: "Receipts", tone: "primary" },
  { icon: "FileText", label: "Statements", tone: "primary" },
  { icon: "Headphones", label: "Support", tone: "primary" },
  { icon: "PackageSearch", label: "Procurement", tone: "accent" },
  { icon: "BriefcaseBusiness", label: "Project Financing", tone: "primary" },
  { icon: "ShoppingBasket", label: "Foodstuff Purchase", tone: "success" },
  { icon: "ShieldCheck", label: "Guarantor approvals", tone: "success" },
  { icon: "Bell", label: "Notifications", tone: "accent" },
  { icon: "RefreshCw", label: "Updates", tone: "accent" },
] as const

export const adminStats = [
  { label: "Members", value: "1,248", detail: "38 pending review" },
  { label: "Financing requests", value: "19", detail: "₦8.4m requested" },
  { label: "Collections", value: "₦42m", detail: "94% on schedule" },
] as const

export const adminExceptions = [
  {
    label: "Financing approvals",
    value: "7 waiting",
    detail: "2 high-priority member requests need review.",
  },
  {
    label: "Member onboarding",
    value: "38 pending",
    detail: "Documents and role assignments still need checks.",
  },
  {
    label: "Monthly commitments",
    value: "62 follow-ups",
    detail: "Members with missed or partial contribution records.",
  },
] as const

export const detailSections = {
  commitments: {
    title: "Commitments",
    subtitle: "Track cooperative commitments and monthly readiness.",
    rows: ["July commitment due", "Standing contribution active", "No arrears"],
  },
  financing: {
    title: "Financing",
    subtitle:
      "Request, monitor, and repay interest-free cooperative financing.",
    rows: ["Eligible for ₦500k", "One active repayment", "Request draft saved"],
  },
  shares: {
    title: "Shares",
    subtitle: "Review share holdings and ownership movement.",
    rows: [
      "120 units held",
      "Dividend profile complete",
      "Next update monthly",
    ],
  },
  members: {
    title: "Members",
    subtitle: "Manage members, roles, onboarding, and account health.",
    rows: ["38 onboarding checks", "12 role updates", "4 support escalations"],
  },
  finance: {
    title: "Finance",
    subtitle: "Review collections, financing requests, and ledger exceptions.",
    rows: ["19 financing requests", "₦42m collected", "8 ledger exceptions"],
  },
  reports: {
    title: "Reports",
    subtitle: "Board-ready operational and member finance summaries.",
    rows: ["Monthly summary", "Financing portfolio", "Commitment variance"],
  },
}
