import { createDbRuntime, listMembers } from "@halaal-vest/db"
import { BackfillWorkspacePageView } from "@/components/backfill-workspace-page-view"
import { getDashboardServerContext } from "@/lib/server-context"

const demoAmountLogs = [
  {
    id: "amount-1",
    effectiveFrom: "2024-01-01",
    amount: 20000,
    notes: "Initial monthly remittance",
  },
  {
    id: "amount-2",
    effectiveFrom: "2024-08-01",
    amount: 25000,
    notes: "Salary increase applied",
  },
]

const demoShareOverrides = [
  {
    id: "override-1",
    effectiveFrom: "2025-03-01",
    amount: 18000,
    notes: "Custom business-member share contribution",
  },
]

const demoMonthRows = [
  {
    id: "row-1",
    label: "Jan 2024",
    amount: 20000,
    charge: 2500,
    loanCollected: 0,
    loanServiceAmount: 0,
    monthlyTopup: 0,
    pendingLoanPayment: 0,
    share: 10000,
    totalShare: 10000,
    total: 20000,
    activities: [],
  },
  {
    id: "row-2",
    label: "Feb 2024",
    amount: 20000,
    charge: 2500,
    loanCollected: 0,
    loanServiceAmount: 0,
    monthlyTopup: 0,
    pendingLoanPayment: 0,
    share: 10000,
    totalShare: 20000,
    total: 20000,
    activities: [],
  },
  {
    id: "row-3",
    label: "Mar 2025",
    amount: 25000,
    charge: 3000,
    loanCollected: 10000,
    loanServiceAmount: 10000,
    monthlyTopup: 5000,
    pendingLoanPayment: 0,
    share: 18000,
    totalShare: 198000,
    total: 25000,
    activities: [
      {
        id: "activity-1",
        activityType: "loan_taken",
        activityDate: "2025-03-03",
        amount: 120000,
        notes: "Quick loan disbursed",
      },
      {
        id: "activity-2",
        activityType: "profit_dividend",
        activityDate: "2025-03-29",
        amount: 8500,
        notes: "Q1 allocation",
      },
    ],
  },
  {
    id: "row-4",
    label: "Apr 2025",
    amount: 25000,
    charge: 3000,
    loanCollected: 8000,
    loanServiceAmount: 10000,
    monthlyTopup: 5000,
    pendingLoanPayment: 2000,
    share: 18000,
    totalShare: 216000,
    total: 25000,
    isEdited: true,
    activities: [],
  },
]

export default async function BackfillPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (context.tenant && runtime.status === "database-configured") {
    const [members] = await Promise.all([
      listMembers(context.tenant.id, { page: 1, pageSize: 20 }),
    ])

    const member = members.items[0]

    return (
      <BackfillWorkspacePageView
        amountLogs={demoAmountLogs}
        memberName={member?.fullName ?? "No member selected"}
        memberNumber={member?.memberNumber ?? "No member number"}
        monthRows={demoMonthRows}
        shareOverrides={demoShareOverrides}
      />
    )
  }

  return (
    <BackfillWorkspacePageView
      amountLogs={demoAmountLogs}
      memberName="Amina Yusuf"
      memberNumber="HV-00014"
      monthRows={demoMonthRows}
      shareOverrides={demoShareOverrides}
    />
  )
}
