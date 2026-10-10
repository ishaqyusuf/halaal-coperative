export async function loadStoreProducts<T>(
  productIds: string[],
  fetchProducts: (productIds: string[]) => Promise<T[] | null | undefined>
): Promise<{ products: T[]; lookupFailed: boolean }> {
  if (!productIds.length) return { products: [], lookupFailed: false }
  try {
    const products = await fetchProducts(productIds)
    return {
      products: products ?? [],
      lookupFailed: products == null,
    }
  } catch {
    return { products: [], lookupFailed: true }
  }
}
