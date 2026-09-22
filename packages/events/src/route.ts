import { analyticsBatchSchema } from "@ishaqyusuf/logly-core"
import { nativeBatchSchema } from "./contracts"
import { isAllowedOrigin, safeBatch, safeNativeBatch } from "./policy"
import { readBatchBody } from "./read-batch-body"

export function createEventsRoute(
  surface: "dashboard" | "marketing" | "mobile"
) {
  return async function POST(request: Request) {
    const collector = process.env.LOGLY_COLLECTOR_URL
    const key =
      surface === "dashboard"
        ? process.env.LOGLY_DASHBOARD_PROJECT_KEY
        : surface === "marketing"
          ? process.env.LOGLY_MARKETING_PROJECT_KEY
          : process.env.LOGLY_MOBILE_PROJECT_KEY
    const allowed =
      (surface === "dashboard"
        ? process.env.LOGLY_DASHBOARD_ALLOWED_ORIGINS
        : surface === "marketing"
          ? process.env.LOGLY_MARKETING_ALLOWED_ORIGINS
          : process.env.LOGLY_MOBILE_ORIGIN
      )
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? []
    if (!collector || !key || !allowed.length)
      return Response.json(
        { error: "Analytics is not configured" },
        { status: 503 }
      )
    const origin = request.headers.get("origin")
    if (
      surface === "mobile"
        ? Boolean(origin)
        : !origin || !isAllowedOrigin(origin, allowed)
    )
      return Response.json({ error: "Origin not allowed" }, { status: 403 })
    const collectorOrigin = surface === "mobile" ? allowed[0]! : origin!
    if (!isAllowedOrigin(collectorOrigin, allowed))
      return Response.json(
        { error: "Analytics is not configured" },
        { status: 503 }
      )
    const input = await readBatchBody(request)
    if (input.ok === false)
      return Response.json(
        { error: input.status === 413 ? "Batch too large" : "Invalid batch" },
        { status: input.status }
      )
    const batch =
      surface === "mobile"
        ? (() => {
            const parsed = nativeBatchSchema.safeParse(input.body)
            return parsed.success ? safeNativeBatch(parsed.data) : null
          })()
        : (() => {
            const parsed = analyticsBatchSchema.safeParse(input.body)
            return parsed.success
              ? safeBatch(parsed.data, `halaalvest-${surface}`)
              : null
          })()
    if (!batch)
      return Response.json({ error: "Invalid batch" }, { status: 400 })
    if (!batch.events.length)
      return Response.json({ accepted: 0 }, { status: 202 })
    const country =
      process.env.VERCEL === "1"
        ? request.headers.get("x-vercel-ip-country")
        : null
    try {
      const response = await fetch(
        `${collector.replace(/\/$/, "")}/v1/events`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-logly-project-key": key,
            "x-logly-origin": collectorOrigin,
            ...(country && /^[A-Z]{2}$/.test(country)
              ? { "x-logly-country": country }
              : {}),
          },
          body: JSON.stringify(batch),
          signal: AbortSignal.timeout(4000),
        }
      )
      // Do not reflect collector diagnostics or credentials to public callers.
      if (!response.ok)
        return Response.json(
          { error: "Analytics unavailable" },
          { status: response.status }
        )
      return Response.json({ accepted: batch.events.length }, { status: 202 })
    } catch {
      return Response.json({ error: "Analytics unavailable" }, { status: 502 })
    }
  }
}
