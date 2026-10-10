import { describe, expect, test } from "bun:test"
import { renderNotificationEmail } from "./notification"

describe("Cooperative Ledger notification email", () => {
  test("renders the approved structure with tenant identity and amount facts", async () => {
    const html = await renderNotificationEmail({
      actionLabel: "Review approval details",
      actionUrl: "https://app.halaalvest.com/financing/HV-FIN-2048",
      amount: "₦850,000",
      amountLabel: "Approved amount",
      bodyText: "The finance committee approved your financing request.",
      details: [
        { label: "Plan", value: "Normal financing" },
        { label: "Repayment term", value: "18 months" },
      ],
      eventLabel: "Financing decision",
      organizationName: "Amanah Cooperative",
      previewText: "Your financing request is approved",
      recipientName: "Amina",
      statusLabel: "APPROVED",
      subject: "Your financing request is approved",
      variant: "success",
    })
    const readableHtml = html.replaceAll("<!-- -->", "")

    expect(html).toStartWith("<!DOCTYPE html")
    expect(html).toContain("#0b1f36")
    expect(html).toContain("#1f7a3d")
    expect(html).toContain("Amanah Cooperative")
    expect(readableHtml).toContain("Hello Amina,")
    expect(html).toContain("₦850,000")
    expect(html).toContain("APPROVED")
    expect(html).toContain("Repayment term")
    expect(html).toContain("Review approval details")
    expect(html).toContain("recorded cooperative activity")
  })

  test("escapes untrusted copy and keeps the global greeting faith-neutral", async () => {
    const html = await renderNotificationEmail({
      actionLabel: "Open dashboard",
      actionUrl: "https://app.halaalvest.com",
      bodyText: '<script>alert("unsafe")</script>',
      eventLabel: "Account verification",
      previewText: "Verify your account",
      recipientName: "Member",
      subject: "Verify your account",
    })
    const readableHtml = html.replaceAll("<!-- -->", "")

    expect(html).not.toContain('<script>alert("unsafe")</script>')
    expect(html).toContain("&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;")
    expect(readableHtml).toContain("Hello Member,")
    expect(readableHtml).not.toContain("Assalamu")
    expect(html).toContain("recorded account activity")
  })
})
