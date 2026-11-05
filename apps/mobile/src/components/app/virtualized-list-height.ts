/**
 * Height of the bounded list box. Rows taller than the estimate must not leave
 * the first row scrolling inside a short box, so the measured content height
 * wins once known; the estimate only sizes the first frame.
 */
export function resolveVirtualizedListHeight(input: {
  contentHeight: number | null
  estimatedItemSize: number
  itemCount: number
  maxHeight: number
}) {
  const estimated = Math.max(
    input.estimatedItemSize,
    input.itemCount * input.estimatedItemSize
  )
  const content =
    input.contentHeight && input.contentHeight > 0
      ? input.contentHeight
      : estimated

  return Math.min(input.maxHeight, content)
}
