import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  rmdir,
  stat,
} from "node:fs/promises"
import { join, resolve } from "node:path"

// Shared notes channel for parallel agent sessions. One Markdown file per
// session and topic (`q8-fast-qa-tooling.md`), the same shape sessions already
// write by hand. Posts append a section with a machine-readable marker; files
// without markers are still listed and read as a single free-form note.
export const noteKinds = [
  "note",
  "handoff",
  "finding",
  "status",
  "question",
] as const
export type NoteKind = (typeof noteKinds)[number]
export type NoteEntry = {
  file: string
  at: string
  author: string
  kind: NoteKind | "free-form"
  body: string
}

const marker = "<!-- agent-note: "
const slug = /^[a-z0-9][a-z0-9-]{0,63}$/

export function resolveNotesDirectory(
  root: string,
  options: { dir?: string },
  env: NodeJS.ProcessEnv = process.env
) {
  const explicit = options.dir ?? env.HALAALVEST_AGENT_NOTES_DIR?.trim()
  return resolve(explicit || join(root, ".scratch/agent-notes"))
}

export function noteFileName(author: string, topic: string) {
  if (!slug.test(author) || !slug.test(topic))
    throw new Error("--as and --topic must be lower-case slugs (a-z, 0-9, -).")
  return `${author}-${topic}.md`
}

// Notes leave this repository's control (other sessions, transcripts), so
// refuse anything shaped like a credential instead of trusting the author.
const secretPatterns = [
  /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]+@/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:sk|rk|re|pk)_(?:live|test)_[A-Za-z0-9]{8,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\b(?:AUTH|QA_ACCELERATOR|TRIGGER)_SECRET(?:_KEY)?=\S+/,
  /\b[A-Z0-9_]*(?:PASSWORD|API_KEY|TOKEN)=\S+/,
]
export function looksSecret(body: string) {
  return secretPatterns.some((pattern) => pattern.test(body))
}

// Hand-written notes follow `<session>-<topic>.md`; the prefix names the author.
function fileAuthor(file: string) {
  return file.split("-")[0]!.replace(/\.md$/, "").toLowerCase() || "unknown"
}

export function parseNotes(
  file: string,
  text: string,
  mtime: Date
): NoteEntry[] {
  const chunks = text.split(marker)
  const freeForm = (body: string): NoteEntry => ({
    file,
    at: mtime.toISOString(),
    author: fileAuthor(file),
    kind: "free-form",
    body,
  })
  if (chunks.length === 1) return text.trim() ? [freeForm(text.trim())] : []
  const entries: NoteEntry[] = []
  const preface = chunks[0]!.trim()
  if (preface && !/^# [^\n]*$/.test(preface)) entries.push(freeForm(preface))
  for (const chunk of chunks.slice(1)) {
    const end = chunk.indexOf(" -->\n")
    if (end < 0)
      throw new Error(`${file}: incomplete note marker; repair before posting.`)
    const meta = JSON.parse(chunk.slice(0, end)) as Partial<NoteEntry>
    if (
      typeof meta.at !== "string" ||
      !Number.isFinite(Date.parse(meta.at)) ||
      typeof meta.author !== "string" ||
      !noteKinds.includes(meta.kind as NoteKind)
    )
      throw new Error(`${file}: invalid note metadata; repair before posting.`)
    const body = chunk
      .slice(end + " -->\n".length)
      .replace(/^## [^\n]*\n+/, "")
      .trim()
    entries.push({
      file,
      at: meta.at,
      author: meta.author,
      kind: meta.kind as NoteKind,
      body,
    })
  }
  return entries
}

export async function readNotes(directory: string): Promise<NoteEntry[]> {
  let names: string[]
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith(".md"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
  const entries = await Promise.all(
    names.map(async (name) => {
      const file = join(directory, name)
      const [text, info] = await Promise.all([
        readFile(file, "utf8"),
        stat(file),
      ])
      return parseNotes(name, text, info.mtime)
    })
  )
  return entries.flat().sort((a, b) => a.at.localeCompare(b.at))
}

export function formatEntry(entry: NoteEntry) {
  return `## ${entry.at} · ${entry.author} · ${entry.kind} · ${entry.file}\n\n${entry.body}`
}

async function withLock<T>(file: string, action: () => Promise<T>) {
  const lock = `${file}.lock`
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await mkdir(lock)
      try {
        return await action()
      } finally {
        await rmdir(lock)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      await new Promise((done) => setTimeout(done, 100))
    }
  }
  throw new Error(
    `Notes file is busy (${lock}). Retry; never remove another writer's lock.`
  )
}

export async function postNote(
  directory: string,
  input: {
    author: string
    topic: string
    kind?: NoteKind
    title?: string
    body: string
  },
  now = new Date()
) {
  const name = noteFileName(input.author, input.topic)
  const kind = input.kind ?? "note"
  if (!noteKinds.includes(kind))
    throw new Error(`--kind must be one of ${noteKinds.join(", ")}.`)
  const body = input.body.trim()
  if (!body || body.length > 16_000 || body.includes(marker))
    throw new Error(
      "A note must be 1-16000 characters and contain no note marker."
    )
  if (looksSecret(body))
    throw new Error(
      "The note looks like it contains a credential. Remove it and refer to the variable name instead."
    )
  await mkdir(directory, { recursive: true })
  const file = join(directory, name)
  return withLock(file, async () => {
    let exists = true
    try {
      parseNotes(name, await readFile(file, "utf8"), now)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      exists = false
    }
    const entry: NoteEntry = {
      file: name,
      at: now.toISOString(),
      author: input.author,
      kind,
      body,
    }
    const header = exists
      ? ""
      : `# ${input.title?.trim() || `${input.author} · ${input.topic}`}\n`
    const meta = JSON.stringify({
      at: entry.at,
      author: entry.author,
      kind: entry.kind,
    })
    await appendFile(
      file,
      `${header}\n${marker}${meta} -->\n## ${entry.at} · ${entry.author} · ${entry.kind}\n\n${body}\n`,
      "utf8"
    )
    return entry
  })
}
