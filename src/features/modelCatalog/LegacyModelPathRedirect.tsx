import React, { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { Redirect, useLocation, useParams } from 'react-router-dom'
import { assessmentModelApi } from '@/api/path/assessmentModel'

export const LegacyModelPathRedirect: React.FC = () => {
  const { modelCode } = useParams<{ modelCode?: string }>()
  const location = useLocation()
  const family = location.pathname.startsWith('/personality') ? 'personality' : 'behavior-ability'
  const [target, setTarget] = useState<string>()
  useEffect(() => {
    if (family === 'personality') return setTarget(`/typology${location.pathname.slice('/personality'.length)}${location.search}`)
    if (!modelCode) return setTarget(`/behavioral-rating${location.pathname.slice('/behavior-ability'.length)}${location.search}`)
    assessmentModelApi.getAssessmentModel(modelCode).then(([, response]) => {
      const base = response?.data.kind === 'cognitive' ? '/cognitive' : '/behavioral-rating'
      setTarget(`${base}${location.pathname.slice('/behavior-ability'.length)}${location.search}`)
    })
  }, [family, location.pathname, location.search, modelCode])
  return target ? <Redirect to={target} /> : <Spin />
}
