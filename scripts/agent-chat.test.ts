import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runChat } from "./agent-chat"
import {
  looksSecret,
  noteFileName,
  postNote,
  readNotes,
  resolveNotesDirectory,
} from "./lib/agent-notes"

const dirs: string[] = []
function notesDir() {
  const dir = mkdtempSync(join(tmpdir(), "agent-notes-test-"))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

describe("agent notes channel", () => {
  test("concurrent posts to one file keep every entry", async () => {
    const dir = notesDir()
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        postNote(dir, {
          author: "q8",
          topic: "fast-qa",
          kind: i % 2 ? "finding" : "status",
          body: `Entry ${i}\n\nSecond paragraph.`,
        })
      )
    )
    const entries = await readNotes(dir)
    expect(entries).toHaveLength(10)
    expect(new Set(entries.map((e) => e.body)).size).toBe(10)
    const markdown = readFileSync(join(dir, "q8-fast-qa.md"), "utf8")
    expect(markdown.startsWith("# q8 · fast-qa\n")).toBe(true)
    expect(markdown.match(/^# /gm)).toHaveLength(1)
  })

  test("reads hand-written sibling notes as free-form entries", async () => {
    const dir = notesDir()
    writeFileSync(
      join(dir, "Q1-dependency-audit.md"),
      "# Q1 audit\n\nRewrote bun.lock.\n"
    )
    await postNote(dir, { author: "q8", topic: "tooling", body: "Hand-over." })
    const entries = await readNotes(dir)
    expect(entries.map((e) => [e.file, e.kind])).toContainEqual([
      "Q1-dependency-audit.md",
      "free-form",
    ])
    expect(entries.find((e) => e.kind === "free-form")).toMatchObject({
      author: "q1",
    })
    expect(entries.find((e) => e.kind === "free-form")?.body).toContain(
      "Rewrote bun.lock."
    )
  })

  test("refuses credential-shaped bodies and unsafe names", async () => {
    const dir = notesDir()
    for (const body of [
      "HALAALVEST_DATABASE_URL is postgresql://postgres:hunter2@127.0.0.1:55434/x",
      "QA_ACCELERATOR_SECRET=abc123",
      "RESEND_API_KEY=re_123",
      "-----BEGIN PRIVATE KEY-----",
    ]) {
      expect(looksSecret(body), body).toBe(true)
      await expect(
        postNote(dir, { author: "q8", topic: "x", body })
      ).rejects.toThrow("credential")
    }
    expect(
      looksSecret("Set QA_ACCELERATOR_SECRET in .env.local (value not shown).")
    ).toBe(false)
    expect(() => noteFileName("../q8", "x")).toThrow("slugs")
    expect(() => noteFileName("Q8", "x")).toThrow("slugs")
  })

  test("folder resolves from --dir, then env, then the gitignored default", () => {
    expect(resolveNotesDirectory("/repo", { dir: "/notes" }, {})).toBe("/notes")
    expect(
      resolveNotesDirectory(
        "/repo",
        {},
        { HALAALVEST_AGENT_NOTES_DIR: "/shared" }
      )
    ).toBe("/shared")
    expect(resolveNotesDirectory("/repo", {}, {})).toBe(
      "/repo/.scratch/agent-notes"
    )
  })

  test("CLI post, list and read round-trip with filters", async () => {
    const dir = notesDir()
    const log = spyOn(console, "log").mockImplementation(() => {})
    try {
      await runChat([
        "post",
        "--as",
        "q8",
        "--topic",
        "tooling",
        "--kind",
        "handoff",
        "--body",
        "Ready for review.",
        "--dir",
        dir,
      ])
      await runChat([
        "post",
        "--as",
        "q9",
        "--topic",
        "other",
        "--body",
        "Unrelated.",
        "--dir",
        dir,
      ])
      log.mockClear()
      await runChat(["read", "--from", "q8", "--dir", dir])
      const output = log.mock.calls.flat().join("\n")
      expect(output).toContain("q8 · handoff · q8-tooling.md")
      expect(output).toContain("Ready for review.")
      expect(output).not.toContain("Unrelated.")
      log.mockClear()
      await runChat(["list", "--dir", dir])
      expect(log.mock.calls.flat().join("\n")).toContain(
        "q9-other.md  (1 entry)"
      )
    } finally {
      log.mockRestore()
    }
    await expect(runChat(["post", "--as", "q8", "--dir", dir])).rejects.toThrow(
      "--topic"
    )
    await expect(
      runChat(["read", "--last", "0", "--dir", dir])
    ).rejects.toThrow("--last")
    await expect(runChat(["shout", "--dir", dir])).rejects.toThrow(
      "Unknown command"
    )
  })
})
