import { describe, expect, test } from "bun:test"
import type { AssistantPart, AssistantTurnOutput } from "@halaalvest/assistant"
import { fixtureAnswers, fixtureProposal } from "@halaalvest/assistant/fixtures"
import { type ChannelRenderOptions, renderTurnForChannel } from "./render"
import type { ChannelMessage } from "./types"

const APP = "https://app.halaalvest.test"
const REPLY_ID = "3d2c1b0a-9f8e-4d7c-8b6a-5f4e3d2c1b0a"

function output(
  parts: AssistantPart[],
  proposals = [] as AssistantTurnOutput["proposals"]
): AssistantTurnOutput {
  const createdAt = "2026-11-14T10:00:00.000Z"
  return {
    conversationId: "conversation-1",
    userMessage: { id: "u-1", role: "user", parts: [], createdAt },
    reply: { id: REPLY_ID, role: "assistant", parts, createdAt },
    proposals,
  }
}

const options = (
  provider: ChannelRenderOptions["provider"] = "telegram"
): ChannelRenderOptions => ({
  provider,
  role: "member",
  appUrl: APP,
  messagingChannelEnabled: true,
})

function urls(messages: ChannelMessage[]) {
  return messages.flatMap((message) =>
    (message.buttons ?? []).flatMap((button) =>
      button.kind === "url" ? [button.url] : []
    )
  )
}

const fullAnswer = {
  kind: "url",
  label: "See the full answer",
  url: `${APP}/assistant/m/${REPLY_ID}`,
}

describe("channel reply links", () => {
  test("a draft hands off to its review page, never confirming in chat", () => {
    const messages = renderTurnForChannel(
      output(
        [{ type: "proposal", proposalId: fixtureProposal.id, revision: 1 }],
        [fixtureProposal]
      ),
      options()
    )
    expect(messages).toEqual([
      {
        text: expect.stringContaining("Nothing is saved until you confirm there."),
        buttons: [
          {
            kind: "url",
            label: "Review in Halaalvest",
            url: `${APP}/assistant/review/${fixtureProposal.id}`,
          },
        ],
      },
    ])
  })

  test("a cut-down list links to the full saved answer", () => {
    const base = fixtureAnswers.receipts.items[0]!
    const items = Array.from({ length: 7 }, (_, index) => ({
      ...base,
      id: `rc_${index}`,
      reference: `RCPT-${100 + index}`,
    }))
    const [message] = renderTurnForChannel(
      output([
        { type: "answer", answer: { ...fixtureAnswers.receipts, items } },
      ]),
      options()
    )
    expect(message!.text).toContain("…and 2 more in Halaalvest.")
    expect(message!.buttons).toEqual([fullAnswer])

    // A short list keeps its own page link.
    const [short] = renderTurnForChannel(
      output([{ type: "answer", answer: fixtureAnswers.receipts }]),
      options()
    )
    expect(short!.buttons).toEqual([
      { kind: "url", label: "All receipts", url: `${APP}/payment-receipts` },
    ])
  })

  test("link-mode answers, long text and extra messages open the saved answer", () => {
    // M01 is link mode on WhatsApp.
    const [linked] = renderTurnForChannel(
      output([{ type: "answer", answer: fixtureAnswers.financingStatus }]),
      options("whatsapp")
    )
    expect(linked!.buttons).toEqual([fullAnswer])

    const [long] = renderTurnForChannel(
      output([{ type: "text", text: "a".repeat(4000) }]),
      options()
    )
    expect(long!.text.length).toBeLessThanOrEqual(3501)
    expect(long!.buttons).toEqual([fullAnswer])

    const many = renderTurnForChannel(
      output(
        Array.from({ length: 6 }, (_, index) => ({
          type: "text" as const,
          text: `part ${index}`,
        }))
      ),
      options()
    )
    expect(many.map((message) => message.text)).toEqual([
      "part 0",
      "part 1",
      "part 2",
      "There's more in this answer.",
    ])
    expect(many[3]!.buttons).toEqual([fullAnswer])
  })

  test("no amount ever appears in a link or, by default, in chat", () => {
    const messages = [
      ...renderTurnForChannel(
        output(
          [
            { type: "answer", answer: fixtureAnswers.financingStatus },
            { type: "answer", answer: fixtureAnswers.receipts },
            { type: "answer", answer: fixtureAnswers.investments },
            { type: "proposal", proposalId: fixtureProposal.id, revision: 1 },
          ],
          [fixtureProposal]
        ),
        options()
      ),
      ...renderTurnForChannel(
        output([{ type: "answer", answer: fixtureAnswers.financingStatus }]),
        options("whatsapp")
      ),
    ]
    for (const url of urls(messages)) {
      expect(url.startsWith(`${APP}/`)).toBe(true)
      // IDs only: no digit run long enough to be an amount (fixture IDs have none).
      expect(url).not.toMatch(/\d{4,}|amount|₦|NGN/i)
    }
    expect(JSON.stringify(messages)).not.toContain("₦")
    expect(urls(messages)).toContain(
      `${APP}/assistant/review/${fixtureProposal.id}`
    )
  })
})
