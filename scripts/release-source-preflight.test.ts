import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import {
  assertLaunchSourcePresent,
  requiredLaunchSourcePaths,
} from "./release-source-preflight"

describe("release source preflight", () => {
  test("rejects an incomplete checkout and accepts the required launch inputs", async () => {
    const repoDir = await mkdtemp(
      path.join(tmpdir(), "halaalvest-source-test-")
    )
    const omitted = requiredLaunchSourcePaths[0]
    try {
      for (const relativePath of requiredLaunchSourcePaths.slice(1)) {
        const file = path.join(repoDir, relativePath)
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(
          file,
          relativePath.endsWith("xlsx-0.20.3.tgz")
            ? await readFile(path.join(import.meta.dir, "..", relativePath))
            : "source"
        )
      }
      await expect(assertLaunchSourcePresent(repoDir)).rejects.toThrow(omitted)
      const file = path.join(repoDir, omitted)
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(
        file,
        await readFile(path.join(import.meta.dir, "..", omitted))
      )
      await expect(assertLaunchSourcePresent(repoDir)).resolves.toBeUndefined()
      const personalAccessRoute = path.join(
        repoDir,
        "apps/api/src/routers/mobile-app-access.route.ts"
      )
      await rm(personalAccessRoute)
      await expect(assertLaunchSourcePresent(repoDir)).rejects.toThrow(
        "mobile-app-access.route.ts"
      )
      await writeFile(personalAccessRoute, "source")
      const reviewGrantQuery = path.join(
        repoDir,
        "packages/db/src/queries/mobile-app-review-grants.ts"
      )
      await rm(reviewGrantQuery)
      await expect(assertLaunchSourcePresent(repoDir)).rejects.toThrow(
        "mobile-app-review-grants.ts"
      )
      await writeFile(reviewGrantQuery, "source")
      const reviewGrantMigration = path.join(
        repoDir,
        "packages/db/prisma/migrations/20260929014614_mobile_app_review_grant/migration.sql"
      )
      await rm(reviewGrantMigration)
      await expect(assertLaunchSourcePresent(repoDir)).rejects.toThrow(
        "20260929014614_mobile_app_review_grant/migration.sql"
      )
      await writeFile(reviewGrantMigration, "source")
      const deletionForm = path.join(
        repoDir,
        "apps/marketing/src/components/external-deletion-request-form.tsx"
      )
      await rm(deletionForm)
      await expect(assertLaunchSourcePresent(repoDir)).rejects.toThrow(
        "external-deletion-request-form.tsx"
      )
      await writeFile(deletionForm, "source")
      await writeFile(file, "modified tarball")
      await expect(assertLaunchSourcePresent(repoDir)).rejects.toThrow(
        "Vendored SheetJS tarball integrity mismatch"
      )
    } finally {
      await rm(repoDir, { recursive: true, force: true })
    }
  })
})
