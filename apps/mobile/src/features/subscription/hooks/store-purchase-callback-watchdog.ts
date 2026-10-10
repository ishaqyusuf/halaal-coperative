const CALLBACK_WAIT_MS = 30_000

export function createStorePurchaseCallbackWatchdog(
  onMissingCallback: () => void,
  schedule: (
    callback: () => void,
    delay: number
  ) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout
) {
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let expectedProduct: string | null = null
  const clear = () => {
    if (timer !== null) cancel(timer)
    timer = null
  }
  const observed = (productId?: string) => {
    if (productId && expectedProduct && productId !== expectedProduct) return
    expectedProduct = null
    generation++
    clear()
  }
  return {
    begin(productId: string) {
      clear()
      expectedProduct = productId
      return ++generation
    },
    dispatched(requestGeneration: number) {
      if (requestGeneration !== generation) return
      clear()
      timer = schedule(() => {
        if (requestGeneration === generation) {
          expectedProduct = null
          onMissingCallback()
        }
        timer = null
      }, CALLBACK_WAIT_MS)
    },
    observed,
    observedError(productId?: string | null, productIds?: string[] | null) {
      if (
        !expectedProduct ||
        (productId !== expectedProduct &&
          !productIds?.includes(expectedProduct))
      )
        return false
      observed(expectedProduct)
      return true
    },
    pending() {
      return expectedProduct !== null
    },
    cancel() {
      expectedProduct = null
      generation++
      clear()
    },
  }
}
