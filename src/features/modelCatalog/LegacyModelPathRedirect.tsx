import React, { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { Redirect, useLocation, useParams } from 'react-router-dom'
import { assessmentModelApi } from '@/api/path/assessmentModel'

const normalizeLegacySuffix = (pathname: string, family: '/personality' | '/behavior-ability'): string => {
  const suffix = pathname.slice(family.length)
  return suffix === '/list' ? '' : suffix
}

export const buildLegacyModelTarget = (
  pathname: string,
  search = '',
  modelKind?: string
): string => {
  if (pathname.startsWith('/personality')) {
    return `/typology${normalizeLegacySuffix(pathname, '/personality')}${search}`
  }
  const base = modelKind === 'cognitive' ? '/cognitive' : '/behavioral-rating'
  return `${base}${normalizeLegacySuffix(pathname, '/behavior-ability')}${search}`
}

export const LegacyModelPathRedirect: React.FC = () => {
  const { modelCode } = useParams<{ modelCode?: string }>()
  const location = useLocation()
  const family = location.pathname.startsWith('/personality') ? 'personality' : 'behavior-ability'
  const [target, setTarget] = useState<string>()
  useEffect(() => {
    if (family === 'personality') return setTarget(buildLegacyModelTarget(location.pathname, location.search))
    if (!modelCode || modelCode === 'new') return setTarget(buildLegacyModelTarget(location.pathname, location.search))
    assessmentModelApi.getAssessmentModel(modelCode).then(([, response]) => {
      setTarget(buildLegacyModelTarget(location.pathname, location.search, response?.data.kind))
    })
  }, [family, location.pathname, location.search, modelCode])
  return target ? <Redirect to={target} /> : <Spin />
}
