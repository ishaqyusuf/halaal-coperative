import { Directory, File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { isLegacyPrivateReportFilename } from "./private-report-cache"

const REPORT_CACHE_DIRECTORY = "halaalvest-private-reports"

function reportDirectory() {
  return new Directory(Paths.cache, REPORT_CACHE_DIRECTORY)
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export function savePrivateReportFile(input: {
  content: string
  filename: string
}) {
  const directory = reportDirectory()
  directory.create({ idempotent: true })
  const file = new File(
    directory,
    `${createClientSubmissionKey()}-${safeFilename(input.filename)}`
  )
  file.create()
  file.write(input.content)
  return { uri: file.uri }
}

export async function clearPrivateReportFiles() {
  const directory = reportDirectory()
  if (directory.exists) directory.delete()
  for (const entry of Paths.cache.list()) {
    if (entry instanceof File && isLegacyPrivateReportFilename(entry.name)) {
      entry.delete()
    }
  }
}

export function deletePrivateReportFile(uri: string | null) {
  if (!uri) return
  const file = new File(uri)
  if (file.exists) file.delete()
}

export async function sharePrivateReportFile(input: {
  filename: string
  mimeType: string
  uri: string
}) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Native sharing is unavailable on this device.")
  }
  await Sharing.shareAsync(input.uri, {
    dialogTitle: `Share ${input.filename}`,
    mimeType: input.mimeType,
    UTI: "public.comma-separated-values-text",
  })
}
