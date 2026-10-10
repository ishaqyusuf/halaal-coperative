// Same local-infra-kit release flow as GND and EwaTrade. Main releases
// Production; other branches (or --preview) release the owned preview branch.
const team = "team_BV5rgKHJH4fMyFL1YfscZIZK"
const easEnv = { EXPO_NO_DOTENV: "1" }

export default {
  project: "halaalvest",
  sharedEnvPrefix: "HALAALVEST_",
  productionBranch: "main",
  previewBranch: "preview",
  remote: "origin",
  components: [
    {
      name: "database",
      paths: ["packages/db/prisma/**", "packages/db/prisma.config.ts"],
      sharedPaths: false,
      beforePush: true,
      deploy: {
        preview: "bun run db:push --preview",
        production: "bun run db:push --prod",
      },
    },
    {
      // Includes @halaalvest/api: the hosted API runs inside this app.
      name: "dashboard",
      app: "apps/dashboard",
      paths: [".vercelignore"],
      vercel: { team, projects: ["halaalvest-dashboard"] },
    },
    {
      name: "marketing",
      app: "apps/marketing",
      paths: [".vercelignore"],
      vercel: { team, projects: ["halaal-vest-marketing"] },
    },
    {
      name: "jobs",
      app: "packages/jobs",
      paths: [
        "scripts/with-trigger-profile.mjs",
        "scripts/trigger-deploy-profile.ts",
      ],
      deploy: {
        preview: "bun run jobs:preview:deploy",
        production: "bun run jobs:deploy",
      },
    },
    {
      name: "mobile-android",
      paths: [
        ".easignore",
        "scripts/eas-account-runner.ts",
        "scripts/mobile-release-policy.ts",
        "scripts/eas-runner-arguments.ts",
      ],
      expo: {
        appDir: "apps/mobile",
        platforms: ["android"],
        login: "bun run eas:auth",
        easEnv,
        update: {
          preview:
            "bun run eas:update --preview --platform android --expected-commit {sha}",
          production:
            "bun run eas:update --prod --platform android --expected-commit {sha}",
        },
        build: {
          preview:
            "bun run eas:build --preview --platform android --expected-commit {sha} --non-interactive",
          production:
            "bun run eas:build --prod --platform android --expected-commit {sha} --non-interactive",
        },
      },
    },
    {
      // GND's split: iOS store releases are Production-only.
      name: "mobile-ios",
      environments: ["production"],
      env: { check: false },
      paths: [
        ".easignore",
        "scripts/eas-account-runner.ts",
        "scripts/mobile-release-policy.ts",
        "scripts/eas-runner-arguments.ts",
        "scripts/ios-publisher-handoff.ts",
        "scripts/eas-ios-artifact-preflight.ts",
      ],
      expo: {
        appDir: "apps/mobile",
        platforms: ["ios"],
        login: "bun run eas:auth",
        easEnv,
        update: {
          production:
            "bun run eas:update --prod --platform ios --expected-commit {sha}",
        },
        build: {
          production:
            "bun run eas:build --prod --platform ios --expected-commit {sha} --non-interactive",
        },
      },
    },
  ],
}
