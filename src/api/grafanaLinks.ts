import { config } from '@/config/config'

export const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

export const getGrafanaBaseURL = (): string => {
  const explicit = process.env.REACT_APP_GRAFANA_URL || config.grafanaURL || ''
  return explicit ? trimTrailingSlash(explicit) : ''
}

export const resolveGrafanaLink = (explicitEnv: string | undefined, fallbackPath = ''): string | undefined => {
  if (explicitEnv && explicitEnv.trim()) {
    return explicitEnv.trim()
  }

  const base = getGrafanaBaseURL()
  if (!base) return undefined
  if (!fallbackPath) return base
  const normalized = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`
  return `${base}${normalized}`
}

export const buildGrafanaLinks = <T extends string>(
  keys: readonly T[],
  dashboardPaths: Record<T, string>,
  envOverrides: Partial<Record<T, string | undefined>> = {}
): Record<T, string | undefined> => {
  const links = {} as Record<T, string | undefined>
  keys.forEach((key) => {
    links[key] = resolveGrafanaLink(envOverrides[key], dashboardPaths[key])
  })
  return links
}
