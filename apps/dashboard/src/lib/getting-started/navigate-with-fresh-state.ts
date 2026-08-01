type WizardRouter = {
  push: (href: string) => void
  refresh: () => void
}

export function navigateWithFreshWizardState(
  router: WizardRouter,
  href: string,
  options: { refreshDestination?: boolean } = {}
) {
  router.push(href)
  if (options.refreshDestination !== false) {
    router.refresh()
  }
}
