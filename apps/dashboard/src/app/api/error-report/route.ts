import { createAuditLogEntry, createDbRuntime } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import {
  canRecordDashboardErrorReceipt,
  hasDashboardErrorReportDetails,
  sanitizeDashboardErrorReport,
} from "@/lib/error-reporting"
import { getDashboardServerContext } from "@/lib/server-context"

export async function POST(request: NextRequest) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, recorded: false }, { status: 400 })
  }

  const report = sanitizeDashboardErrorReport(payload)

  if (!hasDashboardErrorReportDetails(report)) {
    return NextResponse.json({ ok: false, recorded: false }, { status: 400 })
  }

  if (createDbRuntime().status !== "database-configured") {
    return NextResponse.json({ ok: true, recorded: false })
  }

  try {
    const context = await getDashboardServerContext()

    if (!context.auth.sessionToken || !context.auth.user) {
      return NextResponse.json({ ok: false, recorded: false }, { status: 401 })
    }

    if (
      !canRecordDashboardErrorReceipt({
        hasMembership: Boolean(context.auth.membership),
        hasSession: Boolean(context.auth.sessionToken),
        hasTenant: Boolean(context.tenant),
        hasUser: Boolean(context.auth.user),
      })
    ) {
      return NextResponse.json({ ok: false, recorded: false }, { status: 403 })
    }

    await createAuditLogEntry({
      action: "application.error_captured",
      actorType: "user",
      actorUserId: context.auth.user.id,
      entityId: report.referenceId,
      entityType: "DashboardError",
      metadata: {
        category: report.category,
        code: report.code,
        referenceId: report.referenceId,
        retryable: report.retryable,
        source: report.source,
      },
      tenantId: context.tenant!.id,
    })

    return NextResponse.json({ ok: true, recorded: true })
  } catch {
    return NextResponse.json({ ok: true, recorded: false })
  }
}
