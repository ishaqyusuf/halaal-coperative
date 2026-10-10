import { describe, expect, test } from "bun:test"
import { getExpoMobilePushReceipt, sendExpoMobilePush } from "./mobile-push"

const message = {
  category: "transactions" as const,
  data: {
    action: "open_receipts" as const,
    intendedRole: "member" as const,
    notificationId: "notification-1",
    tenantId: "tenant-1",
    version: 1 as const,
  },
  to: "ExponentPushToken[test-token]",
}

describe("mobile push transport", () => {
  test("sends only generic lock-screen copy and governed action data", async () => {
    let sent: Record<string, unknown> | null = null
    const ticket = await sendExpoMobilePush(message, async (_url, init) => {
      sent = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ data: { id: "ticket-1", status: "ok" } }), {
        status: 200,
      })
    })

    expect(ticket.status).toBe("ok")
    expect(sent).toMatchObject({
      body: "Open Halaalvest to review it.",
      channelId: "transactions",
      title: "Halaalvest update",
    })
    expect(JSON.stringify(sent)).not.toContain("amount")
    expect(JSON.stringify(sent)).not.toContain("balance")
  })

  test("normalizes provider revocation without returning the endpoint", async () => {
    const ticket = await sendExpoMobilePush(message, async () =>
      new Response(
        JSON.stringify({
          data: {
            details: { error: "DeviceNotRegistered" },
            message: "Endpoint is no longer registered",
            status: "error",
          },
        }),
        { status: 200 }
      )
    )

    expect(ticket).toMatchObject({
      errorCode: "DeviceNotRegistered",
      providerTicketId: null,
      status: "error",
    })
  })

  test("normalizes delayed receipts and provider revocation", async () => {
    await expect(
      getExpoMobilePushReceipt("ticket-1", async () =>
        new Response(JSON.stringify({ data: {} }), { status: 200 })
      )
    ).resolves.toEqual({ errorCode: null, message: null, status: "pending" })

    await expect(
      getExpoMobilePushReceipt("ticket-1", async () =>
        new Response(
          JSON.stringify({
            data: {
              "ticket-1": {
                details: { error: "DeviceNotRegistered" },
                message: "The endpoint expired.",
                status: "error",
              },
            },
          }),
          { status: 200 }
        )
      )
    ).resolves.toMatchObject({
      errorCode: "DeviceNotRegistered",
      status: "error",
    })
  })
})
