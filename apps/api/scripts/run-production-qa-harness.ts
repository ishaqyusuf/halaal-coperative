import { provisionProductionQaHarness } from "@halaalvest/db"

const result = await provisionProductionQaHarness({
  environment: process.env.HALAALVEST_ENV ?? "local",
  qaDomain: process.env.PRODUCTION_QA_DOMAIN ?? "ishaq.qa.test",
  runId: process.env.PRODUCTION_QA_RUN_ID ?? "ticket-30-provision",
})

console.log(
  JSON.stringify(
    {
      activeAddons: result.plan.scenarios
        .filter(({ activeAddonCodes }) => activeAddonCodes.length > 0)
        .map(({ activeAddonCodes, key }) => ({ activeAddonCodes, key })),
      complete: result.complete && result.stateCoverage.complete,
      fixtures: result.fixtureResults.map(({ scenarioKey, state, status }) => ({
        scenarioKey,
        state,
        status,
      })),
      scenarios: result.results.map(({ errorCode, scenarioKey, status }) => ({
        errorCode: errorCode ?? null,
        scenarioKey,
        status,
      })),
      stateCoverage: {
        complete: result.stateCoverage.complete,
        expected: result.stateCoverage.expectedStateCount,
        materialized: result.stateCoverage.materializedStateCount,
        scenarios: result.stateCoverage.scenarios.map(
          ({
            activeAddonCodes,
            activeAddonPlanMatches,
            evidenceCode,
            materialized,
            scenarioKey,
          }) => ({
            activeAddonCodes,
            activeAddonPlanMatches,
            evidenceCode,
            materialized,
            scenarioKey,
          })
        ),
      },
    },
    null,
    2
  )
)
