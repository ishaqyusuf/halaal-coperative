import { readdir, readFile, stat, unlink } from "node:fs/promises"
import path from "node:path"

type UploadMetadata = {
  storedFileName?: string
  tenantId?: string
}

export function getQaUploadRoots(currentWorkingDirectory = process.cwd()) {
  const configuredRoot = process.env.UPLOAD_DIR?.trim()

  return [
    ...new Set(
      [
        configuredRoot ? path.resolve(configuredRoot) : null,
        path.join(currentWorkingDirectory, ".local", "uploads"),
        path.join(
          currentWorkingDirectory,
          "apps",
          "dashboard",
          ".local",
          "uploads",
        ),
        path.resolve(
          currentWorkingDirectory,
          "..",
          "..",
          ".local",
          "uploads",
        ),
      ].filter((value): value is string => Boolean(value)),
    ),
  ]
}

async function readTenantUploads(root: string, tenantIds: Set<string>) {
  const entries = await readdir(root, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return []
      throw error
    },
  )
  const uploads: Array<{
    bytes: number
    filePath: string
    metadataPath: string
  }> = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue

    const metadataPath = path.join(root, entry.name)
    const metadata = JSON.parse(
      await readFile(metadataPath, "utf8"),
    ) as UploadMetadata

    if (!metadata.tenantId || !tenantIds.has(metadata.tenantId)) continue
    if (!metadata.storedFileName) {
      throw new Error(`Upload metadata ${entry.name} has no stored file name.`)
    }

    const filePath = path.join(root, path.basename(metadata.storedFileName))
    const fileStats = await stat(filePath).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null
        throw error
      },
    )

    uploads.push({
      bytes: fileStats?.size ?? 0,
      filePath,
      metadataPath,
    })
  }

  return uploads
}

export async function previewQaUploads(tenantIds: readonly string[]) {
  const selected = new Set(tenantIds)
  const uploads = (
    await Promise.all(
      getQaUploadRoots().map((root) => readTenantUploads(root, selected)),
    )
  ).flat()

  return {
    fileBytes: uploads.reduce((total, upload) => total + upload.bytes, 0),
    files: uploads.length,
  }
}

export async function deleteQaUploads(tenantId: string) {
  const selected = new Set([tenantId])
  const uploads = (
    await Promise.all(
      getQaUploadRoots().map((root) => readTenantUploads(root, selected)),
    )
  ).flat()

  for (const upload of uploads) {
    await unlink(upload.filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    })
    await unlink(upload.metadataPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    })
  }

  return {
    fileBytes: uploads.reduce((total, upload) => total + upload.bytes, 0),
    files: uploads.length,
  }
}
