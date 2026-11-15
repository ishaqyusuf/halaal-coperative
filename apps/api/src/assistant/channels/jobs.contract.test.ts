import { describe, expect, test } from "bun:test"
import { createAssistantChannelJobDispatch } from "./dispatch"
import { TELEGRAM_WEBHOOK_PATH } from "./routes"
import type { AssistantChannelDispatch } from "./runtime"
import {
  ChannelSendError,
  createChannelHarness,
  fixtureEnv,
  member,
} from "./test-harness"

/**
 * The deployed path: the webhook only admits and queues a job; Trigger.dev
 * runs `runTurnJob` / `runDeliveryJob` (here a fake queue). Fixture traffic.
 */

const TG_USER = 555123456
let updateId = 5000

function update(text: string, from = TG_USER) {
  return {
    update_id: updateId++,
    message: {
      message_id: updateId,
      from: { id: from, is_bot: false, first_name: "Fixture" },
      chat: { id: from, type: "private" },
      text,
    },
  }
}

type Job =
  | { kind: "turn"; inboxId: string; chatKey: string }
  | { kind: "delivery"; outboxId: string; chatKey: string }

function createJobQueue() {
  const jobs: Job[] = []
  const failures: Job["kind"][] = []
  const fail = (kind: Job["kind"]) => {
    const index = failures.indexOf(kind)
    if (index === -1) return
    failures.splice(index, 1)
    throw new Error("trigger unavailable")
  }
  const dispatch: AssistantChannelDispatch = {
    async turn(job) {
      fail("turn")
      jobs.push({ kind: "turn", ...job })
    },
    async delivery(job) {
      fail("delivery")
      jobs.push({ kind: "delivery", ...job })
    },
  }
  return {
    jobs,
    dispatch,
    failNext: (kind: Job["kind"]) => failures.push(kind),
    take: <K extends Job["kind"]>(kind: K) => {
      const taken = jobs.filter((job) => job.kind === kind) as Extract<
        Job,
        { kind: K }
      >[]
      for (const job of taken) jobs.splice(jobs.indexOf(job), 1)
      return taken
    },
  }
}

function setup() {
  const queue = createJobQueue()
  const harness = createChannelHarness(fixtureEnv, { dispatch: queue.dispatch })
  const post = (body: unknown) =>
    harness.app.request(TELEGRAM_WEBHOOK_PATH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token":
          fixtureEnv.ASSISTANT_TELEGRAM_WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    })
  /** Runs queued jobs like Trigger.dev would, retrying `retry` up to 3 times. */
  const runJobs = async () => {
    const statuses: string[] = []
    const attempts = new Map<Job, number>()
    while (queue.jobs.length) {
      const job = queue.jobs.shift()!
      const result =
        job.kind === "turn"
          ? await harness.runtime.runTurnJob(job.inboxId)
          : await harness.runtime.runDeliveryJob(job.outboxId)
      statuses.push(`${job.kind}:${result.status}`)
      const attempt = (attempts.get(job) ?? 1) + 1
      if (result.status === "retry" && attempt <= 3) {
        attempts.set(job, attempt)
        queue.jobs.push(job)
      }
    }
    return statuses
  }
  const link = async () => {
    const started = await harness.runtime.startLink(member, "telegram")
    expect((await post(update(`/start ${started.nonce}`))).status).toBe(200)
    await runJobs()
    const [pending] = await harness.runtime.pendingLinks(member)
    await harness.runtime.confirmLink(member, pending!.challengeId)
    await runJobs()
    expect(harness.lastText()).toContain("Connected ✓")
  }
  const inboxFor = (text: string) =>
    harness.memory.inbox.find(
      (row) => (row.payload as { text: string }).text === text
    )!
  return { queue, harness, post, runJobs, link, inboxFor }
}

describe("channel jobs: webhook admission", () => {
  test("admits each event once and queues a turn job; no work runs in the webhook", async () => {
    const { queue, harness, post, runJobs } = setup()
    const body = update("hello")
    expect((await post(body)).status).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
    expect(harness.memory.inbox[0]!.state).toBe("received")
    expect(harness.sent).toHaveLength(0)
    expect(harness.turns).toHaveLength(0)

    const [job] = queue.jobs as Extract<Job, { kind: "turn" }>[]
    expect(job).toMatchObject({
      kind: "turn",
      inboxId: harness.memory.inbox[0]!.id,
    })
    // The concurrency key is a chat digest: no chat ID or phone number.
    expect(job!.chatKey).toMatch(/^telegram-[0-9a-f]{32}$/)
    expect(job!.chatKey).not.toContain(String(TG_USER))

    // A provider retry before the job ran re-queues the same row (the
    // Trigger idempotency key keeps it to one run) and adds no inbox row.
    expect((await post(body)).status).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
    expect(new Set(queue.take("turn").map((item) => item.inboxId)).size).toBe(1)

    queue.jobs.push(job!)
    await runJobs()
    expect(harness.sent).toHaveLength(1)
    expect(harness.lastText()).toContain("Connect your Halaalvest account")

    // Once answered, a late retry is acknowledged with no job at all.
    expect((await post(body)).status).toBe(200)
    expect(queue.jobs).toHaveLength(0)
    expect(harness.memory.inbox).toHaveLength(1)
  })

  test("a failed job trigger answers 503; the provider retry queues it", async () => {
    const { queue, harness, post } = setup()
    const body = update("hello")
    queue.failNext("turn")
    expect((await post(body)).status).toBe(503)
    expect(harness.memory.inbox).toHaveLength(1)
    expect(queue.jobs).toHaveLength(0)

    expect((await post(body)).status).toBe(200)
    expect(harness.memory.inbox).toHaveLength(1)
    expect(queue.jobs).toEqual([
      expect.objectContaining({
        kind: "turn",
        inboxId: harness.memory.inbox[0]!.id,
      }),
    ])
  })

  test("dispatch is on only when Trigger and the worker secret are both set", () => {
    const enqueue: AssistantChannelDispatch = {
      turn: async () => undefined,
      delivery: async () => undefined,
    }
    const secret = "w".repeat(32)
    expect(createAssistantChannelJobDispatch({}, enqueue)).toBeUndefined()
    expect(
      createAssistantChannelJobDispatch(
        { TRIGGER_SECRET_KEY: "tr_dev_x" },
        enqueue
      )
    ).toBeUndefined()
    expect(
      createAssistantChannelJobDispatch(
        { TRIGGER_SECRET_KEY: "tr_dev_x", ASSISTANT_CHANNEL_WORKER_SECRET: "short" },
        enqueue
      )
    ).toBeUndefined()
    expect(
      createAssistantChannelJobDispatch(
        { TRIGGER_SECRET_KEY: "tr_dev_x", ASSISTANT_CHANNEL_WORKER_SECRET: secret },
        enqueue
      )
    ).toBe(enqueue)
  })
})

describe("channel jobs: turn processing", () => {
  test("one chat runs oldest first, whichever job runs first", async () => {
    const { queue, harness, post, runJobs, link } = setup()
    await link()
    const before = harness.turns.length
    for (const text of ["receipts one", "loan two", "receipts three"])
      expect((await post(update(text))).status).toBe(200)
    const turnJobs = queue.take("turn")
    expect(turnJobs).toHaveLength(3)
    // Trigger may start any queued run first; each takes the oldest row.
    for (const job of [...turnJobs].reverse())
      expect((await harness.runtime.runTurnJob(job.inboxId)).status).toBe(
        "done"
      )
    expect(harness.turns.slice(before).map((turn) => turn.input.text)).toEqual(
      ["receipts one", "loan two", "receipts three"]
    )
    // Each turn queued one delivery job, keyed to the same chat.
    const deliveries = queue.jobs.filter((job) => job.kind === "delivery")
    expect(deliveries).toHaveLength(3)
    expect(new Set(deliveries.map((job) => job.chatKey))).toEqual(
      new Set([turnJobs[0]!.chatKey])
    )
    const sentBefore = harness.sent.length
    await runJobs()
    expect(
      harness.sent
        .slice(sentBefore)
        .map((item) => item.message.text.split("\n")[0])
    ).toEqual(["Your receipts", "Financing as of 14 Nov 2026", "Your receipts"])
  })

  test("a failed turn retries the same row before later messages", async () => {
    const { queue, harness, post, link, inboxFor } = setup()
    await link()
    await post(update("receipts first"))
    await post(update("loan second"))
    const [, secondJob] = queue.take("turn")
    harness.failNextTurn()
    expect((await harness.runtime.runTurnJob(secondJob!.inboxId)).status).toBe(
      "retry"
    )
    const first = inboxFor("receipts first")
    expect(first).toMatchObject({ state: "received", attempts: 1 })
    expect(inboxFor("loan second").state).toBe("received")

    // The retry (or any later job in this chat) takes the failed row first,
    // with the same request id, so a replay returns the saved reply.
    expect((await harness.runtime.runTurnJob(secondJob!.inboxId)).status).toBe(
      "done"
    )
    const attempts = harness.turns.filter(
      (turn) => turn.input.text === "receipts first"
    )
    expect(attempts).toHaveLength(2)
    expect(attempts[0]!.input.requestId).toBe(`telegram-${first.id}`)
    expect(attempts[1]!.input.requestId).toBe(attempts[0]!.input.requestId)
    expect(inboxFor("loan second").state).toBe("received")
    expect((await harness.runtime.runTurnJob(secondJob!.inboxId)).status).toBe(
      "done"
    )
    expect(inboxFor("loan second").state).toBe("done")
  })

  test("retries are bounded: the third failure replies with an apology", async () => {
    const { queue, harness, post, runJobs, link, inboxFor } = setup()
    await link()
    await post(update("receipts please"))
    harness.failNextTurn()
    harness.failNextTurn()
    harness.failNextTurn()
    const statuses = await runJobs()
    expect(statuses.filter((status) => status.startsWith("turn:"))).toEqual([
      "turn:retry",
      "turn:retry",
      "turn:done",
    ])
    expect(inboxFor("receipts please")).toMatchObject({
      state: "done",
      attempts: 3,
    })
    expect(harness.lastText()).toContain("Sorry, I couldn't answer that")
    expect(queue.jobs).toHaveLength(0)
  })

  test("authorization failures reply once and never retry", async () => {
    const { harness, post, runJobs, link } = setup()
    await link()
    const before = harness.turns.length
    await post(update("receipts"))
    harness.failNextTurn(
      Object.assign(new Error("not allowed"), { code: "FORBIDDEN" })
    )
    const statuses = await runJobs()
    expect(statuses).toContain("turn:done")
    expect(statuses).not.toContain("turn:retry")
    expect(harness.turns.length - before).toBe(1)
    expect(harness.lastText()).toContain("I can't do that here")
  })

  test("each job re-resolves the live membership before the turn", async () => {
    const { harness, post, runJobs, link } = setup()
    await link()
    await post(update("loan status"))
    // Role changed after the event was admitted, before the job ran.
    harness.memberships[0]!.role = "finance_officer"
    await runJobs()
    expect(harness.turns.at(-1)!.principal).toMatchObject({
      role: "finance_officer",
      channel: "telegram",
      tenantId: member.tenantId,
      membershipId: member.membershipId,
    })

    const turns = harness.turns.length
    harness.memberships[0]!.userDeleted = true
    await post(update("receipts"))
    await runJobs()
    expect(harness.turns).toHaveLength(turns)
    expect(harness.lastText()).toContain("has ended")
    expect((await harness.runtime.status(member)).providers[0]).toMatchObject({
      connected: false,
    })
  })

  test("a row left processing by a dead worker is reclaimed and replays", async () => {
    const { queue, harness, post, link, inboxFor } = setup()
    await link()
    await post(update("receipts"))
    const [job] = queue.take("turn")
    // The worker leased the row, then died before finishing it.
    Object.assign(inboxFor("receipts"), { state: "processing", attempts: 1 })
    expect((await harness.runtime.runTurnJob(job!.inboxId)).status).toBe("done")
    expect(inboxFor("receipts")).toMatchObject({ state: "done", attempts: 2 })
    expect(harness.turns.at(-1)!.input.requestId).toBe(
      `telegram-${job!.inboxId}`
    )
  })

  test("a lost delivery trigger is re-queued by the turn job's retry", async () => {
    const { queue, harness, post, link } = setup()
    await link()
    await post(update("receipts"))
    const [job] = queue.take("turn")
    const turns = harness.turns.length
    queue.failNext("delivery")
    await expect(harness.runtime.runTurnJob(job!.inboxId)).rejects.toThrow(
      "trigger unavailable"
    )
    expect(queue.jobs).toHaveLength(0)
    expect((await harness.runtime.runTurnJob(job!.inboxId)).status).toBe("idle")
    expect(queue.jobs).toEqual([
      expect.objectContaining({ kind: "delivery", chatKey: job!.chatKey }),
    ])
    expect(harness.turns).toHaveLength(turns + 1)
  })

  test("jobs stop when the channel flag is turned off", async () => {
    const queue = createJobQueue()
    const off = createChannelHarness(
      { ...fixtureEnv, ASSISTANT_TELEGRAM_ENABLED: "false" },
      { dispatch: queue.dispatch }
    )
    const { store } = off.memory
    const admitted = await store.admitInbox({
      environment: "test",
      provider: "telegram",
      endpointId: "bot",
      eventId: "1",
      providerChatId: "1",
      linkId: null,
      payload: { kind: "text", text: "hi" },
    })
    expect((await off.runtime.runTurnJob(admitted.id)).status).toBe("disabled")
    expect(off.turns).toHaveLength(0)
  })
})

describe("channel jobs: delivery", () => {
  test("a retryable rejection backs off and resends without rerunning the turn", async () => {
    const { queue, harness, post, link } = setup()
    await link()
    await post(update("receipts"))
    const [turnJob] = queue.take("turn")
    await harness.runtime.runTurnJob(turnJob!.inboxId)
    const turns = harness.turns.length
    const sent = harness.sent.length
    const [delivery] = queue.take("delivery")
    const row = () =>
      harness.memory.outbox.find((item) => item.id === delivery!.outboxId)!

    harness.failNextSend()
    expect(
      (await harness.runtime.runDeliveryJob(delivery!.outboxId)).status
    ).toBe("retry")
    expect(row()).toMatchObject({ state: "pending", attempts: 1 })
    expect(harness.sent).toHaveLength(sent)

    expect(
      (await harness.runtime.runDeliveryJob(delivery!.outboxId)).status
    ).toBe("sent")
    expect(row()).toMatchObject({ state: "sent", attempts: 2 })
    expect(harness.sent).toHaveLength(sent + 1)
    expect(harness.turns).toHaveLength(turns)
  })

  test("retryable rejections are bounded at three sends", async () => {
    const { queue, harness, post, link } = setup()
    await link()
    await post(update("receipts"))
    await harness.runtime.runTurnJob(queue.take("turn")[0]!.inboxId)
    const [delivery] = queue.take("delivery")
    for (let index = 0; index < 3; index += 1) harness.failNextSend()
    const statuses = []
    for (let index = 0; index < 3; index += 1)
      statuses.push(
        (await harness.runtime.runDeliveryJob(delivery!.outboxId)).status
      )
    expect(statuses).toEqual(["retry", "retry", "failed"])
    expect(
      harness.memory.outbox.find((item) => item.id === delivery!.outboxId)
    ).toMatchObject({ state: "failed", attempts: 3, errorCode: "RATE_LIMITED" })
  })

  test("an unknown outcome is recorded and never resent", async () => {
    const { queue, harness, post, link } = setup()
    await link()
    await post(update("receipts"))
    await harness.runtime.runTurnJob(queue.take("turn")[0]!.inboxId)
    const [delivery] = queue.take("delivery")
    const sent = harness.sent.length
    harness.failNextSend(new ChannelSendError("TIMEOUT", "unknown"))
    expect(
      (await harness.runtime.runDeliveryJob(delivery!.outboxId)).status
    ).toBe("unknown")
    // A job retry (or a later delivery job) finds nothing to send.
    expect(
      (await harness.runtime.runDeliveryJob(delivery!.outboxId)).status
    ).toBe("idle")
    expect(harness.sent).toHaveLength(sent)
    expect(
      harness.memory.outbox.find((item) => item.id === delivery!.outboxId)
    ).toMatchObject({ state: "unknown", attempts: 1, errorCode: "TIMEOUT" })
  })

  test("a send cut off mid-flight reconciles to unknown; later replies still go out in order", async () => {
    const { queue, harness, post, link } = setup()
    await link()
    await post(update("receipts"))
    await post(update("loan"))
    for (const job of queue.take("turn"))
      await harness.runtime.runTurnJob(job.inboxId)
    const [first, second] = queue.take("delivery")
    // The first send started, then the worker died before recording it.
    Object.assign(
      harness.memory.outbox.find((item) => item.id === first!.outboxId)!,
      { state: "sending", attempts: 1 }
    )
    const sent = harness.sent.length
    expect((await harness.runtime.runDeliveryJob(first!.outboxId)).status).toBe(
      "unknown"
    )
    expect(
      harness.memory.outbox.find((item) => item.id === first!.outboxId)
    ).toMatchObject({ state: "unknown", errorCode: "SEND_INTERRUPTED" })
    expect(
      harness.sent.slice(sent).map((item) => item.message.text.split("\n")[0])
    ).toEqual(["Financing as of 14 Nov 2026"])
    expect(
      (await harness.runtime.runDeliveryJob(second!.outboxId)).status
    ).toBe("idle")
  })

  test("a revoked link stops queued delivery", async () => {
    const { queue, harness, post, link } = setup()
    await link()
    await post(update("receipts"))
    await harness.runtime.runTurnJob(queue.take("turn")[0]!.inboxId)
    const [delivery] = queue.take("delivery")
    await harness.runtime.disconnect(member, "telegram")
    const sent = harness.sent.length
    await harness.runtime.runDeliveryJob(delivery!.outboxId)
    expect(
      harness.memory.outbox.find((item) => item.id === delivery!.outboxId)
    ).toMatchObject({ state: "failed", errorCode: "LINK_REVOKED" })
    // Only the "Disconnected" notice (no link) goes out.
    expect(harness.sent.slice(sent).map((item) => item.message.text)).toEqual([
      "Disconnected. This chat no longer has access to Halaalvest.",
    ])
  })
})
