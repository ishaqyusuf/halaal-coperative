import { createHash } from "node:crypto"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"

// These launch inputs are currently absent from a clean checkout of HEAD.
// Their presence is a minimum release-source check, not proof that every
// dependency is committed or included in the final EAS/Vercel archive.
export const requiredLaunchSourcePaths = [
  "apps/dashboard/vendor/xlsx-0.20.3.tgz",
  "apps/mobile/release-version.js",
  "apps/mobile/release-version.ts",
  // Store builds require the separate per-user app-access authority and paywall.
  "apps/api/src/routers/mobile-app-access.route.ts",
  "apps/mobile/src/runtime/mobile-app-access-provider.ts",
  "apps/mobile/src/features/mobile-app-access/routes/mobile-app-access-route-controller.tsx",
  "packages/db/prisma/models/mobile-app-access.prisma",
  "packages/db/prisma/migrations/20260929014614_mobile_app_review_grant/migration.sql",
  "packages/db/src/queries/mobile-app-access.ts",
  "packages/db/src/queries/mobile-app-review-grants.ts",
  "packages/domain/src/modules/public-policies.ts",
  "packages/db/src/legal-publication.ts",
  "apps/marketing/src/components/external-deletion-request-form.tsx",
  "apps/marketing/app/delete-account/page.tsx",
  "apps/marketing/app/terms/page.tsx",
  "apps/marketing/app/privacy/page.tsx",
  "apps/marketing/app/support/page.tsx",
  "apps/marketing/app/billing-policy/page.tsx",
  "apps/marketing/app/cooperative-disclosures/page.tsx",
] as const

const sheetJsTarballPath = "apps/dashboard/vendor/xlsx-0.20.3.tgz"
const sheetJsTarballSha256 =
  "8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8"

export async function assertLaunchSourcePresent(repoDir: string) {
  const missing: string[] = []
  for (const relativePath of requiredLaunchSourcePaths) {
    try {
      if (!(await stat(path.join(repoDir, relativePath))).isFile()) {
        missing.push(relativePath)
      }
    } catch {
      missing.push(relativePath)
    }
  }
  if (missing.length) {
    throw new Error(
      `Release source is incomplete or the required launch feature is not implemented; missing: ${missing.join(", ")}. Complete and review the per-user mobile app-access source before a store build, then inspect the exact upload archive.`
    )
  }
  const sheetJsTarball = await readFile(path.join(repoDir, sheetJsTarballPath))
  if (
    createHash("sha256").update(sheetJsTarball).digest("hex") !==
    sheetJsTarballSha256
  ) {
    throw new Error("Vendored SheetJS tarball integrity mismatch.")
  }
}
