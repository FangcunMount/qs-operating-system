import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, List, Space, Tag, message } from 'antd'
import { Link, useHistory, useLocation } from 'react-router-dom'
import {
  assessmentModelApi,
  AssessmentModelListParams,
  CreateAssessmentModelRequest
} from '@/api/path/assessmentModel'
import { assessmentReleaseApi } from '@/api/path/assessmentRelease'
import type { AssessmentModelKind } from '@/models/assessmentModel'

export type CanonicalModelKind = 'typology' | 'behavioral_rating' | 'cognitive'

const CONFIG: Record<CanonicalModelKind, { title: string; base: string }> = {
  typology: { title: '类型学模型', base: '/typology' },
  behavioral_rating: { title: '行为评分模型', base: '/behavioral-rating' },
  cognitive: { title: '认知测评模型', base: '/cognitive' }
}

const kindFromPath = (pathname: string): CanonicalModelKind => {
  if (pathname.startsWith('/behavioral-rating')) return 'behavioral_rating'
  if (pathname.startsWith('/cognitive')) return 'cognitive'
  return 'typology'
}

const ModelCatalogPage: React.FC = () => {
  const history = useHistory()
  const location = useLocation()
  const kind = kindFromPath(location.pathname)
  const config = CONFIG[kind]
  const modelCode = /^\/(?:typology|behavioral-rating|cognitive)\/(?:info|definition|publish)\/([^/]+)$/.exec(location.pathname)?.[1]
  const [models, setModels] = useState<any[]>([])
  const [definition, setDefinition] = useState('{}')
  const [loading, setLoading] = useState(false)
  const isDefinition = location.pathname.includes('/definition/')
  const isPublish = location.pathname.includes('/publish/')

  const listParams = useMemo<AssessmentModelListParams>(() => ({ kind }), [kind])

  const load = async () => {
    setLoading(true)
    const [error, response] = await assessmentModelApi.listAssessmentModels(listParams)
    setLoading(false)
    if (error || !response) return message.error('获取模型列表失败')
    setModels(response.data.models)
  }

  useEffect(() => { if (!modelCode) load() }, [kind, modelCode])
  useEffect(() => {
    if (!modelCode || !isDefinition) return
    assessmentModelApi.getAssessmentModelDefinition(modelCode).then(([error, response]) => {
      if (error || !response) {
        message.error('获取 DefinitionV2 失败')
        return
      }
      setDefinition(JSON.stringify(response.data, null, 2))
    })
  }, [modelCode, isDefinition])

  const create = async () => {
    const request: CreateAssessmentModelRequest = {
      title: `新的${config.title}`,
      kind: kind as AssessmentModelKind,
      algorithm: kind === 'typology' ? 'personality_typology' : ''
    }
    const [error, response] = await assessmentModelApi.createAssessmentModel(request)
    if (error || !response) return message.error('创建模型失败')
    history.push(`${config.base}/info/${response.data.code}`)
  }

  const saveDefinition = async () => {
    if (!modelCode) return
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(definition) } catch { return message.error('DefinitionV2 不是有效 JSON') }
    const [error] = await assessmentModelApi.saveAssessmentModelDefinition(modelCode, parsed as any)
    if (error) return message.error('保存 DefinitionV2 失败')
    message.success('DefinitionV2 已保存')
  }

  const lifecycle = async (action: 'publish' | 'unpublish' | 'archive') => {
    if (!modelCode) return
    const fn =
      action === 'publish'
        ? assessmentReleaseApi.publishAssessmentRelease
        : action === 'unpublish'
          ? assessmentReleaseApi.unpublishAssessmentRelease
          : assessmentReleaseApi.archiveAssessmentRelease
    const [error] = await fn(modelCode)
    if (error) return message.error(`${action} 失败`)
    const [, snapshot] = await assessmentModelApi.getPublishedAssessmentModel(modelCode)
    if (action === 'publish' && !snapshot) return message.error('发布后快照读取失败')
    message.success(`${action} 成功`)
  }

  if (!modelCode) {
    return (
      <Card
        title={config.title}
        extra={<Button type="primary" onClick={create}>新建模型</Button>}
      >
        <List
          loading={loading}
          dataSource={models}
          renderItem={(model) => (
            <List.Item
              actions={[
                <Link key="info" to={`${config.base}/info/${model.code}`}>编辑</Link>,
                <Link key="definition" to={`${config.base}/definition/${model.code}`}>
                  DefinitionV2
                </Link>,
                <Link key="publish" to={`${config.base}/publish/${model.code}`}>发布</Link>
              ]}
            >
              <List.Item.Meta title={model.title} description={model.code} />
              <Tag>{model.status}</Tag>
            </List.Item>
          )}
        />
      </Card>
    )
  }

  return (
    <Card title={`${config.title}：${modelCode}`} extra={<Link to={config.base}>返回列表</Link>}>
      {isDefinition ? (
        <>
          <Input.TextArea
            value={definition}
            onChange={(event) => setDefinition(event.target.value)}
            autoSize={{ minRows: 18 }}
          />
          <Button type="primary" style={{ marginTop: 16 }} onClick={saveDefinition}>
            保存 DefinitionV2
          </Button>
        </>
      ) : null}
      {isPublish ? (
        <Space>
          <Button onClick={() => lifecycle('publish')}>发布</Button>
          <Button onClick={() => lifecycle('unpublish')}>下架</Button>
          <Button danger onClick={() => lifecycle('archive')}>归档</Button>
        </Space>
      ) : null}
      {!isDefinition && !isPublish ? (
        <Space>
          <Link to={`${config.base}/definition/${modelCode}`}>编辑 DefinitionV2</Link>
          <Link to={`${config.base}/publish/${modelCode}`}>生命周期</Link>
        </Space>
      ) : null}
    </Card>
  )
}

export default ModelCatalogPage
