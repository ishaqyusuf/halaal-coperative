export type MemberHomeLayoutPolicy = {
  actionDetailLineLimit: number | undefined
  metricColumns: 1 | 2
  readinessMetadataLineLimit: 1 | undefined
  serviceLayout: "compact" | "full" | "wide"
}

export function resolveMemberHomeLayoutPolicy(
  largeTextLayout: boolean,
  fontScale = 1
): MemberHomeLayoutPolicy {
  if (largeTextLayout) {
    return {
      actionDetailLineLimit: undefined,
      metricColumns: 1,
      readinessMetadataLineLimit: undefined,
      serviceLayout: fontScale >= 1.8 ? "full" : "wide",
    }
  }

  return {
    actionDetailLineLimit: 2,
    metricColumns: 2,
    readinessMetadataLineLimit: 1,
    serviceLayout: "compact",
  }
}
