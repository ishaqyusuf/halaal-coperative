#!/usr/bin/env bun

function parseArgs(argv: string[]) {
  let task = "dev"
  const turboArgs: string[] = []
  let index = 0

  while (index < argv.length) {
    const arg = argv[index]

    if (arg === "--task") {
      const nextTask = argv[index + 1]

      if (!nextTask) {
        throw new Error("Missing value for --task.")
      }

      task = nextTask
      index += 2
      continue
    }

    turboArgs.push(arg)
    index += 1
  }

  return { task, turboArgs }
}

async function run(command: string[], env = process.env) {
  const child = Bun.spawn(command, {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await child.exited

  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}

const { task, turboArgs } = parseArgs(Bun.argv.slice(2))

await run(["bun", "run", "dev:prepare"])
await run(["turbo", task, "--parallel", ...turboArgs])
