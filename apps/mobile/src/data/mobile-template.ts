export const memberStats = [
  { label: "Commitment", value: "₦240k", detail: "72% funded" },
  { label: "Savings", value: "₦860k", detail: "+₦45k this month" },
  { label: "Financing", value: "₦120k", detail: "Next payment Jul 15" },
] as const;

export const memberServices = [
  { icon: "BadgeCheck", label: "Commitments", tone: "accent" },
  { icon: "Wallet", label: "Savings", tone: "success" },
  { icon: "HandCoins", label: "Financing", tone: "primary" },
  { icon: "PieChart", label: "Shares", tone: "accent" },
  { icon: "FileText", label: "Statements", tone: "primary" },
  { icon: "FolderOpen", label: "Documents", tone: "success" },
  { icon: "Bell", label: "Notifications", tone: "accent" },
  { icon: "Headphones", label: "Support", tone: "primary" },
] as const;

export const adminStats = [
  { label: "Members", value: "1,248", detail: "38 pending review" },
  { label: "Financing requests", value: "19", detail: "₦8.4m requested" },
  { label: "Collections", value: "₦42m", detail: "94% on schedule" },
] as const;

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
] as const;

export const detailSections = {
  commitments: {
    title: "Commitments",
    subtitle: "Track cooperative commitments and monthly readiness.",
    rows: ["July commitment due", "Standing contribution active", "No arrears"],
  },
  financing: {
    title: "Financing",
    subtitle: "Request, monitor, and repay interest-free cooperative financing.",
    rows: ["Eligible for ₦500k", "One active repayment", "Request draft saved"],
  },
  shares: {
    title: "Shares",
    subtitle: "Review share holdings and ownership movement.",
    rows: ["120 units held", "Dividend profile complete", "Next update monthly"],
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
};
