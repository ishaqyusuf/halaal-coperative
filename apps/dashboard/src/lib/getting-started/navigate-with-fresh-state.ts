type WizardRouter = {
  push: (href: string) => void
  refresh: () => void
}

export function navigateWithFreshWizardState(
  router: WizardRouter,
  href: string
) {
  router.push(href)
  router.refresh()
}
