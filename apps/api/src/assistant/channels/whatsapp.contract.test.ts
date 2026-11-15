import { describe, expect, test } from "bun:test"
import { signMetaBody } from "./identity"
import { WHATSAPP_WEBHOOK_PATH } from "./routes"
import {
  ChannelSendError,
  createChannelHarness,
  fixtureEnv,
  member,
  otherUser,
} from "./test-harness"

const PHONE = "2348012345678"
const OTHER_PHONE = "2348098765432"
let messageId = 1

function message(
  text: string,
  options: { from?: string; id?: string; phoneNumberId?: string } = {}
) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-fixture",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "2348000000000",
                phone_number_id:
                  options.phoneNumberId ??
                  fixtureEnv.ASSISTANT_WHATSAPP_PHONE_NUMBER_ID,
              },
              messages: [
                {
                  from: options.from ?? PHONE,
                  id: options.id ?? `wamid.fixture.${messageId++}`,
                  timestamp: "1794650400",
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

async function post(
  harness: ReturnType<typeof createChannelHarness>,
  body: unknown,
  signature: string | null | "valid" = "valid"
) {
  const raw = JSON.stringify(body)
  const response = await harness.app.request(WHATSAPP_WEBHOOK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature
        ? {
            "x-hub-signature-256":
              signature === "valid"
                ? signMetaBody(fixtureEnv.ASSISTANT_WHATSAPP_APP_SECRET, raw)
                : signature,
          }
        : {}),
    },
    body: raw,
  })
  await harness.runtime.idle()
  return response
}

async function linkWhatsApp(
  harness: ReturnType<typeof createChannelHarness>,
  from = PHONE,
  owner = member
) {
  const started = await harness.runtime.startLink(owner, "whatsapp")
  expect(
    (await post(harness, message(`LINK ${started.nonce}`, { from }))).status
  ).toBe(200)
  const [pending] = await harness.runtime.pendingLinks(owner)
  return { started, pending: pending! }
}

describe("WhatsApp adapter contract (fixture traffic)", () => {
  test("GET verify handshake echoes the challenge only for the verify token", async () => {
    const harness = createChannelHarness()
    const ok = await harness.app.request(
      `${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=${fixtureEnv.ASSISTANT_WHATSAPP_VERIFY_TOKEN}&hub.challenge=1158201444`
    )
    expect(ok.status).toBe(200)
    expect(await ok.text()).toBe("1158201444")
    const bad = await harness.app.request(
      `${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1`
    )
    expect(bad.status).toBe(401)
  })

  test("webhook auth: HMAC over the raw body; flag off answers 404", async () => {
    const harness = createChannelHarness()
    expect((await post(harness, message("hi"), null)).status).toBe(401)
    expect((await post(harness, message("hi"), "sha256=deadbeef")).status).toBe(
      401
    )
    // A valid signature over different bytes fails.
    const tampered = signMetaBody(
      fixtureEnv.ASSISTANT_WHATSAPP_APP_SECRET,
      JSON.stringify(message("other"))
    )
    expect((await post(harness, message("hi"), tampered)).status).toBe(401)
    expect(harness.memory.inbox).toHaveLength(0)

    const off = createChannelHarness({
      ...fixtureEnv,
      ASSISTANT_WHATSAPP_ENABLED: "false",
    })
    expect((await post(off, message("hi"))).status).toBe(404)
  })

  test("dedupes retried deliveries and ignores other numbers", async () => {
    const harness = createChannelHarness()
    const body = message("hello", { id: "wamid.same" })
    expect((await post(harness, body)).status).toBe(200)
    expect((await post(harness, body)).status).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
    expect(harness.sent).toHaveLength(1)
    expect(
      (await post(harness, message("hi", { phoneNumberId: "999" }))).status
    ).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
  })

  test("link: wa.me deep link, claim, mismatch, expiry and one account per link", async () => {
    const harness = createChannelHarness()
    const { started, pending } = await linkWhatsApp(harness)
    expect(started.deepLink).toBe(
      `https://wa.me/2348000000000?text=${encodeURIComponent(`LINK ${started.nonce}`)}`
    )
    expect(pending.accountMasked).toBe("+234 ••• ••5678")
    await expect(
      harness.runtime.confirmLink(otherUser, pending.challengeId)
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    await harness.runtime.confirmLink(member, pending.challengeId)
    await harness.runtime.idle()
    expect(harness.lastText()).toContain("Connected ✓ Amanah Cooperative")

    // The same WhatsApp account linked by another user moves; the old link is revoked.
    const moved = await linkWhatsApp(harness, PHONE, otherUser)
    const result = await harness.runtime.confirmLink(
      otherUser,
      moved.pending.challengeId
    )
    expect(result.replacedPrevious).toBe(true)
    expect(
      harness.memory.links.filter((link) => link.status === "active")
    ).toHaveLength(1)
    expect(
      harness.memory.links.find((link) => link.status === "active")?.userId
    ).toBe(otherUser.userId)

    const late = await harness.runtime.startLink(member, "whatsapp")
    harness.advance(11 * 60_000)
    await post(harness, message(`LINK ${late.nonce}`, { from: OTHER_PHONE }))
    expect(harness.lastText()).toContain("expired")
  })

  test("linked reads follow channel mode: M03 in chat, M01 as a protected link, no amounts", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkWhatsApp(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)

    await post(harness, message("Has my receipt been approved?"))
    expect(harness.turns.at(-1)!.principal).toMatchObject({
      channel: "whatsapp",
      role: "member",
    })
    const receipts = harness.sent.at(-1)!.message
    expect(receipts.text).toContain("RCPT-097 · 30 Oct 2026 · Approved")
    expect(receipts.text).not.toContain("₦")

    await post(harness, message("What's my loan status?"))
    const financing = harness.sent.at(-1)!.message
    expect(financing.text).toBe("Financing status is ready in Halaalvest.")
    // Link mode opens the exact saved answer; the URL carries only its ID.
    expect(financing.buttons).toEqual([
      {
        kind: "url",
        label: "See the full answer",
        url: expect.stringMatching(
          /^https:\/\/app\.halaalvest\.test\/assistant\/m\/a-whatsapp-[0-9a-f-]{36}$/
        ),
      },
    ])

    await post(harness, message("Here's proof I paid"))
    expect(harness.lastText()).toContain("review and confirm it in Halaalvest")
    expect(harness.sent.at(-1)!.message.buttons).toEqual([
      {
        kind: "url",
        label: "Review in Halaalvest",
        url: "https://app.halaalvest.test/assistant/review/pr_1",
      },
    ])
  })

  test("outbox retry never reruns the turn; unknown outcome is not resent; revoke stops delivery", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkWhatsApp(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    await harness.runtime.idle()

    harness.failNextSend()
    await post(harness, message("Has my receipt been approved?"))
    const first = harness.memory.inbox.at(-1)!
    await harness.runtime.retryDelivery(first.id)
    expect(
      harness.memory.outbox.find((row) => row.inboxId === first.id)?.state
    ).toBe("sent")
    expect(harness.turns).toHaveLength(1)

    harness.failNextSend(new ChannelSendError("NETWORK", "unknown"))
    await post(harness, message("Has my receipt been approved yet?"))
    const second = harness.memory.inbox.at(-1)!
    const sentBefore = harness.sent.length
    await harness.runtime.retryDelivery(second.id)
    expect(
      harness.memory.outbox.find((row) => row.inboxId === second.id)?.state
    ).toBe("unknown")
    expect(harness.sent).toHaveLength(sentBefore)

    harness.failNextSend()
    await post(harness, message("Show my receipts"))
    const third = harness.memory.inbox.at(-1)!
    await post(harness, message("DISCONNECT"))
    expect(harness.lastText()).toContain("Disconnected")
    await harness.runtime.retryDelivery(third.id)
    expect(
      harness.memory.outbox.find((row) => row.inboxId === third.id)
    ).toMatchObject({
      state: "failed",
      errorCode: "LINK_REVOKED",
    })
    await post(harness, message("Show my receipts"))
    expect(harness.turns).toHaveLength(3)
    expect(harness.lastText()).toContain("Connect your Halaalvest account")
  })

  test("refuses bank and identity numbers without running a turn", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkWhatsApp(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    await post(harness, message("my account number is 0123456789"))
    await post(harness, message("BVN 22212345678"))
    expect(harness.turns).toHaveLength(0)
    expect(harness.lastText()).toContain("BVN/NIN")
    expect(JSON.stringify(harness.memory.inbox)).not.toContain("0123456789")
  })
})
