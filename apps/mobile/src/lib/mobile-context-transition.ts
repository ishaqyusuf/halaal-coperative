export async function transitionMobileContext<T>(input: {
  clearDrafts: () => Promise<void>
  clearFiles: () => Promise<void> | void
  clearReads: () => Promise<void>
  loadNextContext: () => Promise<T>
  persistNextContext: (next: T) => Promise<void>
}) {
  const next = await input.loadNextContext()
  await input.clearDrafts()
  await input.clearFiles()
  await input.clearReads()
  await input.persistNextContext(next)
  return next
}
