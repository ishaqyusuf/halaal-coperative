type Operation = "build" | "submit" | "update"

const booleanOptions: Record<Operation, ReadonlySet<string>> = {
  build: new Set([
    "--non-interactive",
    "--no-wait",
    "--local",
    "--clear-cache",
  ]),
  submit: new Set(["--non-interactive", "--no-wait"]),
  update: new Set(["--non-interactive", "--json"]),
}

const valueOptions: Record<Operation, ReadonlySet<string>> = {
  build: new Set(),
  submit: new Set(["--id"]),
  update: new Set(),
}

export function assertForwardedEasArgs(operation: Operation, args: string[]) {
  const seen = new Set<string>()
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    const equalsAt = arg.indexOf("=")
    const option = equalsAt < 0 ? arg : arg.slice(0, equalsAt)
    if (booleanOptions[operation].has(option) && equalsAt < 0) {
      if (seen.has(option))
        throw new Error(`Duplicate ${operation} option: ${option}`)
      seen.add(option)
      continue
    }
    if (valueOptions[operation].has(option)) {
      if (seen.has(option))
        throw new Error(`Duplicate ${operation} option: ${option}`)
      const value = equalsAt >= 0 ? arg.slice(equalsAt + 1) : args[++index]
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${option}.`)
      seen.add(option)
      continue
    }
    throw new Error(`Unsupported eas:${operation} option: ${arg}`)
  }
}
