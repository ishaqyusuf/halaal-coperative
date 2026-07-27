import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  deleteQaUploads,
  getQaUploadRoots,
  previewQaUploads,
} from "./qa-upload-storage"

const originalUploadDir = process.env.UPLOAD_DIR

afterEach(() => {
  if (originalUploadDir === undefined) delete process.env.UPLOAD_DIR
  else process.env.UPLOAD_DIR = originalUploadDir
})

describe("QA upload cleanup", () => {
  test("resolves upload roots without bundler-sensitive import metadata", () => {
    const dashboardDirectory = path.join(
      path.parse(process.cwd()).root,
      "workspace",
      "apps",
      "dashboard",
    )

    expect(getQaUploadRoots(dashboardDirectory)).toContain(
      path.join(dashboardDirectory, ".local", "uploads"),
    )
    expect(getQaUploadRoots(dashboardDirectory)).toContain(
      path.join(path.parse(process.cwd()).root, "workspace", ".local", "uploads"),
    )
  })

  test("counts and removes only files tracked to the selected tenant", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "halaalvest-qa-uploads-"))
    process.env.UPLOAD_DIR = root
    await writeFile(path.join(root, "qa-file.pdf"), "qa")
    await writeFile(
      path.join(root, "qa.json"),
      JSON.stringify({
        storedFileName: "qa-file.pdf",
        tenantId: "tenant-qa",
      }),
    )
    await writeFile(path.join(root, "live-file.pdf"), "live")
    await writeFile(
      path.join(root, "live.json"),
      JSON.stringify({
        storedFileName: "live-file.pdf",
        tenantId: "tenant-live",
      }),
    )

    await expect(previewQaUploads(["tenant-qa"])).resolves.toEqual({
      fileBytes: 2,
      files: 1,
    })
    await expect(deleteQaUploads("tenant-qa")).resolves.toEqual({
      fileBytes: 2,
      files: 1,
    })
    await expect(readFile(path.join(root, "live-file.pdf"), "utf8")).resolves.toBe(
      "live",
    )
    await expect(previewQaUploads(["tenant-qa"])).resolves.toEqual({
      fileBytes: 0,
      files: 0,
    })
  })
})
