# ADR: Vendor patched SheetJS for dashboard workbook imports

Status: Accepted source implementation, 28 September 2026. Deployment and real-file QA remain open.

## Context

The member import workspace accepts CSV, legacy XLS and XLSX files, and `apps/dashboard/src/lib/import-excel.ts` parses user-selected workbooks with `XLSX.read`. The former npm `xlsx` 0.18.5 package is affected by [prototype pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and [regular-expression denial of service](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). GitHub lists no patched npm release. Replacing the parser with CSV-only handling would remove an existing import capability.

## Decision

Keep the XLS/XLSX import and XLSX template contract using the official SheetJS CE 0.20.3 tarball from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, following [SheetJS's installation and vendoring guidance](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). The exact Apache-2.0 package is stored at `apps/dashboard/vendor/xlsx-0.20.3.tgz`; its SHA-256 is `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`. `apps/dashboard/package.json` references `file:vendor/xlsx-0.20.3.tgz`, and `bun.lock` resolves that local path. The release-source preflight requires the file and verifies this SHA-256 before a store build command starts.

## Consequences

The dashboard build no longer needs the SheetJS CDN at install time. A package change requires an explicit tarball, checksum, lockfile, test and documentation update. The current local CSV/XLS/XLSX import round-trip, template workbook, dashboard TypeScript and production build pass. The post-change Bun audit no longer lists the two `xlsx` advisories, but that audit does not establish deployment packaging, browser runtime safety or freedom from future advisories. The vendor file remains untracked in primary `main` and must be included in reviewed release source before any deployment. Other dependency advisories remain open.
