import { describe, expect, test } from "bun:test"
import { createAssistantChannelsRouter } from "../../routers/assistant-channels.route"
import { TELEGRAM_WEBHOOK_PATH } from "./routes"
import {
  ChannelSendError,
  createChannelHarness,
  fixtureEnv,
  member,
  otherUser,
} from "./test-harness"

const TG_USER = 555123456
let updateId = 1000

function update(
  text: string,
  options: { id?: number; from?: number; chatType?: string } = {}
) {
  const from = options.from ?? TG_USER
  return {
    update_id: options.id ?? updateId++,
    message: {
      message_id: updateId,
      from: { id: from, is_bot: false, first_name: "Fixture" },
      chat: { id: from, type: options.chatType ?? "private" },
      text,
    },
  }
}

function callback(data: string, from = TG_USER) {
  return {
    update_id: updateId++,
    callback_query: {
      id: `cb-${updateId}`,
      from: { id: from, is_bot: false },
      data,
      message: { message_id: 1, chat: { id: from, type: "private" } },
    },
  }
}

async function post(
  harness: ReturnType<typeof createChannelHarness>,
  body: unknown,
  secret: string | null = fixtureEnv.ASSISTANT_TELEGRAM_WEBHOOK_SECRET
) {
  const response = await harness.app.request(TELEGRAM_WEBHOOK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}),
    },
    body: JSON.stringify(body),
  })
  await harness.runtime.idle()
  return response
}

async function linkTelegram(
  harness: ReturnType<typeof createChannelHarness>,
  from = TG_USER,
  owner = member
) {
  const started = await harness.runtime.startLink(owner, "telegram")
  expect(
    (await post(harness, update(`/start ${started.nonce}`, { from }))).status
  ).toBe(200)
  const [pending] = await harness.runtime.pendingLinks(owner)
  return { started, pending: pending! }
}

describe("Telegram adapter contract (fixture traffic)", () => {
  test("webhook auth: secret header required; flag off answers 404", async () => {
    const harness = createChannelHarness()
    expect((await post(harness, update("hi"), null)).status).toBe(401)
    expect((await post(harness, update("hi"), "wrong-secret")).status).toBe(401)
    expect(harness.memory.inbox).toHaveLength(0)

    const off = createChannelHarness({
      ...fixtureEnv,
      ASSISTANT_TELEGRAM_ENABLED: "false",
    })
    expect((await post(off, update("hi"))).status).toBe(404)
    expect(off.memory.inbox).toHaveLength(0)
  })

  test("dedupes retried updates and ignores group chats", async () => {
    const harness = createChannelHarness()
    const body = update("hello")
    expect((await post(harness, body)).status).toBe(200)
    expect((await post(harness, body)).status).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
    expect(harness.sent).toHaveLength(1)
    expect(harness.lastText()).toContain("Connect your Halaalvest account")

    expect(
      (await post(harness, update("hello group", { chatType: "group" }))).status
    ).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
  })

  test("link: deep link, claim, confirm in app, mismatch and single use", async () => {
    const harness = createChannelHarness()
    const { started, pending } = await linkTelegram(harness)
    expect(started.deepLink).toBe(
      `https://t.me/halaalvest_fixture_bot?start=${started.nonce}`
    )
    // Only the digest is stored.
    expect(JSON.stringify(harness.memory.challenges)).not.toContain(
      started.nonce
    )
    expect(pending.accountMasked).toBe("Telegram ID ••••3456")
    expect(harness.lastText()).toContain("confirm Telegram ID ••••3456")

    // Another signed-in user cannot confirm someone else's claim.
    await expect(
      harness.runtime.confirmLink(otherUser, pending.challengeId)
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    // A second claim of the same nonce is refused.
    await post(harness, update(`/start ${started.nonce}`, { from: 999000111 }))
    expect(harness.lastText()).toContain("no longer works")

    const confirmed = await harness.runtime.confirmLink(
      member,
      pending.challengeId
    )
    await harness.runtime.idle()
    expect(confirmed).toMatchObject({
      provider: "telegram",
      accountMasked: "Telegram ID ••••3456",
    })
    expect(harness.lastText()).toContain("Connected ✓ Amanah Cooperative")
    expect((await harness.runtime.status(member)).providers[0]).toMatchObject({
      provider: "telegram",
      connected: true,
    })
  })

  test("link expiry: an expired nonce or late confirm connects nothing", async () => {
    const harness = createChannelHarness()
    const late = await harness.runtime.startLink(member, "telegram")
    harness.advance(11 * 60_000)
    await post(harness, update(`/start ${late.nonce}`))
    expect(harness.lastText()).toContain("expired")
    expect(await harness.runtime.pendingLinks(member)).toHaveLength(0)

    const { pending } = await linkTelegram(harness)
    harness.advance(11 * 60_000)
    await expect(
      harness.runtime.confirmLink(member, pending.challengeId)
    ).rejects.toMatchObject({
      code: "EXPIRED",
    })
    expect(harness.memory.links).toHaveLength(0)
  })

  test("linked read answers in chat without amounts; draft hands off to the app", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkTelegram(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    await harness.runtime.idle()

    await post(harness, update("What's my loan status?"))
    expect(harness.turns).toHaveLength(1)
    expect(harness.turns[0]!.principal).toMatchObject({
      ...member,
      tenantName: "Amanah Cooperative",
      role: "member",
      channel: "telegram",
      channelLinkId: harness.memory.links[0]!.id,
    })
    const read = harness.sent.at(-1)!.message
    expect(read.text).toContain("FIN-1877 Laptop financing: repaying")
    expect(read.text).not.toContain("₦")
    expect(read.buttons).toContainEqual({
      kind: "url",
      label: "Open financing",
      url: "https://app.halaalvest.test/loans",
    })

    await post(harness, update("Here's proof I paid"))
    const handoff = harness.sent.at(-1)!.message
    expect(handoff.text).toContain("review and confirm it in Halaalvest")
    expect(handoff.text).not.toContain("₦")
    expect(handoff.buttons?.[0]).toMatchObject({
      kind: "url",
      label: "Review in Halaalvest",
    })

    // A suggestion tap runs the same turn path and clears the spinner.
    await post(harness, callback("t:Has my receipt been approved?"))
    expect(harness.turns.at(-1)!.input.text).toBe(
      "Has my receipt been approved?"
    )
    expect(harness.acknowledged()).toBe(1)
  })

  test("refuses secrets without running a turn and stores them redacted", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkTelegram(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    await post(harness, update("my pin is 4321"))
    expect(harness.turns).toHaveLength(0)
    expect(harness.lastText()).toContain("don't send passwords, PINs")
    expect(JSON.stringify(harness.memory.inbox)).not.toContain("4321")
  })

  test("outbox: a failed send retries without rerunning the turn; unknown is never resent", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkTelegram(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    await harness.runtime.idle()
    const before = harness.sent.length

    harness.failNextSend()
    await post(harness, update("What's my loan status?"))
    const inbox = harness.memory.inbox.at(-1)!
    expect(
      harness.memory.outbox.find((row) => row.inboxId === inbox.id)
    ).toMatchObject({
      state: "pending",
      attempts: 1,
    })
    await harness.runtime.retryDelivery(inbox.id)
    expect(harness.turns).toHaveLength(1)
    expect(harness.sent).toHaveLength(before + 1)
    // Replaying the same event does nothing further.
    await harness.runtime.processInbox(inbox.id)
    expect(harness.turns).toHaveLength(1)

    harness.failNextSend(new ChannelSendError("NETWORK", "unknown"))
    await post(harness, update("What's my loan status again?"))
    const unknownInbox = harness.memory.inbox.at(-1)!
    await harness.runtime.retryDelivery(unknownInbox.id)
    expect(
      harness.memory.outbox.find((row) => row.inboxId === unknownInbox.id)
        ?.state
    ).toBe("unknown")
    expect(harness.sent).toHaveLength(before + 1)
  })

  test("a failed turn retries with the same request id, bounded", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkTelegram(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    harness.failNextTurn()
    await post(harness, update("What's my loan status?"))
    const inbox = harness.memory.inbox.at(-1)!
    expect(inbox.state).toBe("received")
    harness.advance(5 * 60_000)
    await harness.runtime.recover({ olderThanMs: 0 })
    await harness.runtime.idle()
    expect(harness.turns.map((turn) => turn.input.requestId)).toEqual([
      `telegram-${inbox.id}`,
      `telegram-${inbox.id}`,
    ])
    expect(harness.memory.inbox.at(-1)!.state).toBe("done")
  })

  test("revoke stops delivery; /disconnect and app disconnect end access", async () => {
    const harness = createChannelHarness()
    const { pending } = await linkTelegram(harness)
    await harness.runtime.confirmLink(member, pending.challengeId)
    await harness.runtime.idle()

    harness.failNextSend()
    await post(harness, update("What's my loan status?"))
    const queued = harness.memory.inbox.at(-1)!
    const sentBefore = harness.sent.length
    await harness.runtime.disconnect(member, "telegram")
    await harness.runtime.idle()
    expect(harness.lastText()).toContain("Disconnected")
    await harness.runtime.retryDelivery(queued.id)
    expect(
      harness.memory.outbox.find((row) => row.inboxId === queued.id)
    ).toMatchObject({
      state: "failed",
      errorCode: "LINK_REVOKED",
    })
    expect(harness.sent).toHaveLength(sentBefore + 1)

    await post(harness, update("What's my loan status?"))
    expect(harness.turns).toHaveLength(1)
    expect(harness.lastText()).toContain("Connect your Halaalvest account")

    // Relink, then disconnect from the chat itself.
    const again = await linkTelegram(harness)
    await harness.runtime.confirmLink(member, again.pending.challengeId)
    await post(harness, update("/disconnect"))
    expect(harness.lastText()).toContain("Disconnected")
    expect(
      harness.memory.links.every((link) => link.status === "revoked")
    ).toBe(true)
  })

  test("tRPC router scopes every call to the signed session owner", async () => {
    const harness = createChannelHarness()
    const router = createAssistantChannelsRouter(() => harness.runtime)
    const caller = router.createCaller({
      tenant: { current: { id: member.tenantId } },
      auth: {
        session: { user: { id: member.userId } },
        activeMembership: { id: member.membershipId },
      },
      request: {},
    } as never)
    const started = await caller.startLink({ provider: "telegram" })
    expect(started.instruction).toBe(`/start ${started.nonce}`)
    await post(harness, update(`/start ${started.nonce}`))
    const [pending] = await caller.pending()
    await caller.confirmLink({ challengeId: pending!.challengeId })
    expect((await caller.status()).providers[0]!.connected).toBe(true)
    expect(await caller.disconnect({ provider: "telegram" })).toEqual({
      disconnected: true,
    })
  })
})
