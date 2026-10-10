type DocumentReference = {
  documentType: string
  documentVersion: string
  contentHash: string
}

/** An existing account may keep working; this only decides whether to show a reminder. */
export function needsLegalReviewReminder(
  bundle: {
    available: boolean
    documents: readonly DocumentReference[]
  } | null,
  records: readonly DocumentReference[] | null
): boolean {
  if (!bundle?.available || bundle.documents.length === 0 || !records)
    return false

  return bundle.documents.some(
    (document) =>
      !records.some(
        (record) =>
          record.documentType === document.documentType &&
          record.documentVersion === document.documentVersion &&
          record.contentHash === document.contentHash
      )
  )
}
