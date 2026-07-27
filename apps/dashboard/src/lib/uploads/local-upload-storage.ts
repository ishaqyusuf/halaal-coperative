import { randomUUID } from "node:crypto"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getQaUploadRoots } from "@halaalvest/jobs"

const maxUploadBytes = 10 * 1024 * 1024
const uploadIdPattern = /^[a-f0-9-]{36}$/

const allowedContentTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
])

const extensionByContentType = new Map([
  ["application/pdf", ".pdf"],
  ["image/gif", ".gif"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["text/csv", ".csv"],
  ["text/plain", ".txt"],
])

export type DashboardUploadPurpose =
  | "member_document"
  | "opening_balance_source"
  | "payment_receipt_proof"
  | "support_attachment"

type UploadMetadata = {
  contentType: string
  createdAt: string
  id: string
  originalName: string
  purpose: DashboardUploadPurpose
  size: number
  storedFileName: string
  tenantId: string
  userId: string
}

function getUploadRoot() {
  return getQaUploadRoots()[0] ?? path.join(process.cwd(), ".local", "uploads")
}

function sanitizeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "upload"
  )
}

function getSafeExtension(file: File) {
  const fromType = extensionByContentType.get(file.type)
  if (fromType) {
    return fromType
  }

  const extension = path.extname(file.name).toLowerCase()
  return extension.replace(/[^.a-z0-9]/g, "").slice(0, 12)
}

async function ensureUploadRoot() {
  const root = getUploadRoot()
  await mkdir(root, { recursive: true })
  return root
}

export function isSupportedDashboardUploadPurpose(
  value: string
): value is DashboardUploadPurpose {
  return [
    "member_document",
    "opening_balance_source",
    "payment_receipt_proof",
    "support_attachment",
  ].includes(value)
}

export async function saveDashboardUpload({
  file,
  purpose,
  tenantId,
  userId,
}: {
  file: File
  purpose: DashboardUploadPurpose
  tenantId: string
  userId: string
}) {
  if (file.size <= 0) {
    throw new Error("Upload file is empty.")
  }

  if (file.size > maxUploadBytes) {
    throw new Error("Upload file is larger than 10 MB.")
  }

  if (file.type && !allowedContentTypes.has(file.type)) {
    throw new Error("Upload file type is not supported.")
  }

  const id = randomUUID()
  const root = await ensureUploadRoot()
  const safeName = sanitizeFilename(file.name)
  const extension = getSafeExtension(file)
  const storedFileName = `${id}${extension}`
  const filePath = path.join(root, storedFileName)
  const metadataPath = path.join(root, `${id}.json`)
  const bytes = Buffer.from(await file.arrayBuffer())
  const metadata: UploadMetadata = {
    contentType: file.type || "application/octet-stream",
    createdAt: new Date().toISOString(),
    id,
    originalName: safeName,
    purpose,
    size: file.size,
    storedFileName,
    tenantId,
    userId,
  }

  await writeFile(filePath, bytes)
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2))

  return {
    contentType: metadata.contentType,
    id,
    originalName: safeName,
    size: metadata.size,
    url: `/api/uploads/${id}`,
  }
}

export async function readDashboardUpload(id: string) {
  if (!uploadIdPattern.test(id)) {
    return null
  }

  const root = getUploadRoot()
  const metadataPath = path.join(root, `${id}.json`)
  const rawMetadata = await readFile(metadataPath, "utf8")
  const metadata = JSON.parse(rawMetadata) as UploadMetadata
  const filePath = path.join(root, metadata.storedFileName)
  const fileStat = await stat(filePath)

  if (!fileStat.isFile()) {
    return null
  }

  return {
    bytes: await readFile(filePath),
    metadata,
  }
}
