import { createAuditLogEntry, createDbRuntime } from "@halaalvest/db"
import { NextResponse, type NextRequest } from "next/server"
import {
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

    if (!context.tenant) {
      return NextResponse.json({ ok: true, recorded: false })
    }

    await createAuditLogEntry({
      action: "application.error_captured",
      actorType: context.auth.user ? "user" : "system",
      actorUserId: context.auth.user?.id ?? null,
      entityId: report.referenceId,
      entityType: "DashboardError",
      metadata: {
        category: report.category,
        code: report.code,
        referenceId: report.referenceId,
        retryable: report.retryable,
        source: report.source,
      },
      tenantId: context.tenant.id,
    })

    return NextResponse.json({ ok: true, recorded: true })
  } catch {
    return NextResponse.json({ ok: true, recorded: false })
  }
}
