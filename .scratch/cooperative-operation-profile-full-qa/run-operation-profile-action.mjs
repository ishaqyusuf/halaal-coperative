import fs from "node:fs"

const trpcClientModule = await import(
  "file:///Users/M1PRO/Documents/code/halaal-coperative/node_modules/.bun/@trpc+client@11.18.0+60c71f3c0d6cb1f4/node_modules/@trpc/client/dist/index.mjs"
)
const superjsonModule = await import(
  "file:///Users/M1PRO/Documents/code/halaal-coperative/node_modules/.bun/superjson@2.2.6/node_modules/superjson/dist/index.js"
)
const { createTRPCClient, httpBatchLink } = trpcClientModule
const superjson = superjsonModule.default

const mode = process.argv[2] ?? "valid"
const baseUrl =
  process.env.QA_TENANT_URL ??
  "http://codex-qa-620c.halaalvest-dash.localhost:1355"
const cookieJar =
  process.env.QA_COOKIE_JAR ?? "/tmp/halaalvest-qa-cookies-620c.txt"

function readCookieHeader(path) {
  return fs
    .readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line && (!line.startsWith("#") || line.startsWith("#HttpOnly_")))
    .map((line) => line.replace(/^#HttpOnly_/, "").split("\t"))
    .filter((parts) => parts.length >= 7)
    .map((parts) => `${parts[5]}=${parts[6]}`)
    .join("; ")
}

const cookie = readCookieHeader(cookieJar)

const client = createTRPCClient({
  links: [
    httpBatchLink({
      headers: () => ({
        cookie,
        "x-trpc-source": "qa-operation-profile-ticket-03",
      }),
      transformer: superjson,
      url: `${baseUrl}/api/trpc`,
    }),
  ],
})

function operationProfileFields(overrides = {}) {
  const values = {
    changeReason: "QA Operation Profile verification.",
    collection_source_batch_postingAccessMode: "office_only",
    collection_sourcesAccessMode: "office_only",
    foodPurchaseMaximumActiveObligationsPerMember: "2",
    foodPurchaseRequiresOpenCycle: "true",
    food_purchaseAccessMode: "member_self_service",
    payment_receiptsAccessMode: "member_self_service",
    procurementAccessMode: "member_self_service",
    procurementMaximumActiveObligationsPerMember: "2",
    support_casesAccessMode: "member_self_service",
    ...overrides,
  }

  return Object.entries(values)
}

const fields =
  mode === "invalid-procurement-cap"
    ? operationProfileFields({
        procurementMaximumActiveObligationsPerMember: "0",
      })
    : mode === "invalid-food-cap"
      ? operationProfileFields({
          foodPurchaseMaximumActiveObligationsPerMember: "1.5",
        })
      : mode === "restrictive-without-reason"
        ? operationProfileFields({
            changeReason: "",
            procurementAccessMode: "office_only",
          })
        : mode === "restrictive-with-reason"
          ? operationProfileFields({
              changeReason:
                "QA verifies that reducing procurement self-service is audited.",
              procurementAccessMode: "office_only",
            })
      : operationProfileFields()

try {
  await client.dashboardActions.updateTenantOperationProfileAction.mutate({
    fields,
  })
  console.log(`operation-profile-action:${mode}:ok`)
} catch (error) {
  console.log(`operation-profile-action:${mode}:error`)
  console.log(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
