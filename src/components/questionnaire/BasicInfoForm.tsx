import React, { useEffect } from 'react'
import { Form, Input, Card, message, Radio, Checkbox, Space, Select } from 'antd'
import { FormInstance } from 'antd/lib/form'
import type { CheckboxValueType } from 'antd/es/checkbox/Group'
import { observer } from 'mobx-react'
import { scaleStore } from '@/store'

const { TextArea } = Input

export interface QuestionnaireBasicInfoProps {
  questionsheetid: string
  store: any
  api: any
  form: FormInstance
  onSaveSuccess: () => void
  type: 'survey' | 'scale'
}

export interface UseBasicInfoFormParams {
  questionsheetid: string
  store: any
  api: any
  form: FormInstance
  type: 'survey' | 'scale'
}

/**
 * 通用的基本信息表单 Hook
 * 适用于 survey 和 scale 两种问卷类型
 */
export const useBasicInfoForm = ({
  questionsheetid,
  store,
  api,
  form,
  type
}: UseBasicInfoFormParams): {
  handleSave: () => Promise<void>
  syncFormFromStore: () => void
} => {
  // 从 store 同步数据到表单
  const syncFormFromStore = () => {
    form.setFieldsValue({
      title: store.title,
      desc: store.desc,
      img_url: store.img_url,
      ...(type === 'scale' && {
        category: store.category,
        stages: store.stages,
        applicable_ages: store.applicable_ages,
        reporters: store.reporters,
        tags: store.tags
      })
    })
  }

  // 加载已有问卷信息
  const loadExisting = async (id: string) => {
    // 如果 store 有 initEditor 方法，优先使用它（适用于 scale 和 survey）
    if ((store as any).initEditor) {
      if (type === 'scale') {
        // 对于量表类型，尝试从 URL 参数获取 scaleCode（如果可用）
        const urlParams = new URLSearchParams(window.location.search)
        const scaleCode = urlParams.get('scaleCode') || undefined
        await (store as any).initEditor(id, scaleCode)
      } else {
        // 对于问卷类型，直接调用 initEditor
        await (store as any).initEditor(id)
      }
      syncFormFromStore()
      return
    }
    
    // 降级方案：使用原来的逻辑（兼容旧代码）
    const [e, r] = await api.getQuestionSheet(id)
    if (e) return
    if (type === 'survey') {
      store.setSurvey(r?.data.questionsheet)
    } else {
      store.setScale(r?.data.questionsheet)
    }
    syncFormFromStore()
  }

  // 初始化编辑模式
  const initEditMode = (id: string) => {
    // 如果 store 中已有该问卷的数据，直接使用
    // 注意：对于量表类型，还需要检查 scaleCode 是否匹配，避免显示其他量表的数据
    if (store.id === id && store.title) {
      if (type === 'scale') {
        // 对于量表，如果 URL 中有 scaleCode，需要验证是否匹配
        const urlParams = new URLSearchParams(window.location.search)
        const scaleCode = urlParams.get('scaleCode')
        if (scaleCode && (store as any).scaleCode && (store as any).scaleCode !== scaleCode) {
          // scaleCode 不匹配，需要重新加载
          loadExisting(id)
          return
        }
      }
      syncFormFromStore()
    } else {
      // 从服务器加载问卷信息
      loadExisting(id)
    }
  }

  // 初始化新建模式
  const initCreateMode = () => {
    // 尝试从 localStorage 恢复数据
    const restored = store.loadFromLocalStorage()
    
    if (restored && store.title) {
      // 成功恢复数据
      message.success('已恢复上次编辑的内容')
      syncFormFromStore()
    } else if (!store.title) {
      // 首次创建，初始化空白问卷
      if (type === 'survey') {
        store.initSurvey()
      } else {
        store.initScale()
      }
    } else {
      // 从下一步返回，复用 store 中的数据
      syncFormFromStore()
    }
  }

  // 初始化
  useEffect(() => {
    const isEditMode = questionsheetid && questionsheetid !== 'new'
    
    if (isEditMode) {
      initEditMode(questionsheetid)
    } else {
      initCreateMode()
    }
  }, [questionsheetid])

  // 保存问卷基本信息
  const handleSave = async () => {
    const values = await form.validateFields()
    
    // 更新 store 中的数据
    store.title = values.title
    store.desc = values.desc
    store.img_url = values.img_url
    
    // 如果是量表，更新分类信息
    if (type === 'scale') {
      store.category = values.category || ''
      store.stages = values.stages || []
      store.applicable_ages = values.applicable_ages || []
      store.reporters = values.reporters || []
      store.tags = values.tags || []
    }
    
    // 保存基本信息
    await store.saveBasicInfo()
  }

  return {
    handleSave,
    syncFormFromStore
  }
}

/**
 * 通用的基本信息表单组件
 */
export const BasicInfoFormCard: React.FC<{
  form: FormInstance
  type: 'survey' | 'scale'
}> = observer(({ form, type }) => {
  const typeText = type === 'survey' ? '问卷' : '量表'
  const themeClass = type === 'survey' ? 'survey-theme' : 'scale-theme'

  // 加载分类选项
  useEffect(() => {
    if (type === 'scale') {
      scaleStore.ensureCategoryOptions().catch((error) => {
        console.error('获取量表分类失败:', error)
        message.error('获取分类选项失败，请刷新重试')
      })
    }
  }, [type])

  // Radio.Button 单选组件（类似风险等级选择器，风格统一）
  const RadioButtonSelect: React.FC<{
    options: Array<{ value: string; label: string }>
    value?: string
    onChange?: (value: string | undefined) => void
    allowClear?: boolean
  }> = ({ options, value, onChange, allowClear = true }) => {
    const handleChange = (e: any) => {
      const newValue = e.target.value
      // 如果点击已选中的项且允许清除，则清除选择
      if (value === newValue && allowClear) {
        onChange?.(undefined)
      } else {
        onChange?.(newValue)
      }
    }

    return (
      <Radio.Group
        value={value}
        onChange={handleChange}
        className="scale-radio-button-group"
        style={{ width: '100%' }}
      >
        <Space size={[8, 8]} wrap style={{ width: '100%' }}>
          {options.map(opt => (
            <Radio.Button key={opt.value} value={opt.value}>
              {opt.label}
            </Radio.Button>
          ))}
        </Space>
      </Radio.Group>
    )
  }

  // Checkbox 多选组件（更直观的多选 UI）
  const CheckboxMultiSelect: React.FC<{
    options: string[]
    optionLabels?: Array<{ value: string; label: string }>
    value?: string[]
    onChange?: (value: string[]) => void
    maxCount?: number
  }> = ({ options, optionLabels, value = [], onChange, maxCount = 10 }) => {
    const handleChange = (checkedValues: CheckboxValueType[]) => {
      const stringValues = checkedValues.map(v => String(v))
      // 限制最大选择数量
      if (stringValues.length <= maxCount) {
        onChange?.(stringValues)
      } else {
        // 如果超过最大数量，保持原值不变
        message.warning(`最多只能选择 ${maxCount} 个选项`)
      }
    }

    // 获取显示标签
    const getLabel = (val: string) => {
      if (optionLabels) {
        const opt = optionLabels.find(o => o.value === val)
        return opt ? opt.label : val
      }
      return val
    }

    return (
      <Checkbox.Group
        value={value}
        onChange={handleChange}
        className="scale-checkbox-group"
      >
        <Space size={[8, 8]} wrap>
          {options.map(opt => (
            <Checkbox
              key={opt}
              value={opt}
              style={{
                margin: 0,
                padding: '6px 12px',
                borderRadius: '6px',
                transition: 'all 0.3s ease',
                border: '1px solid transparent'
              }}
            >
              {getLabel(opt)}
            </Checkbox>
          ))}
        </Space>
      </Checkbox.Group>
    )
  }

  return (
    <Card title={`${typeText}基本信息`} bordered={false} className={themeClass}>
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          title: '',
          desc: '',
          img_url: '',
          ...(type === 'scale' && {
            category: '',
            stages: [],
            applicable_ages: [],
            reporters: [],
            tags: []
          })
        }}
      >
        <Form.Item
          label={`${typeText}标题`}
          name='title'
          rules={[{ required: true, message: `请输入${typeText}标题` }]}
        >
          <Input placeholder={`请输入${typeText}标题`} maxLength={100} />
        </Form.Item>

        <Form.Item
          label={`${typeText}描述`}
          name='desc'
        >
          <TextArea
            placeholder={`请输入${typeText}描述`}
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {type === 'scale' && (
          <div className="scale-category-group">
            <Form.Item
              label="主类"
              name='category'
              tooltip="选择量表的主要类别"
            >
              <RadioButtonSelect
                options={scaleStore.categoryOptions}
                allowClear
              />
            </Form.Item>

            <Form.Item
              label="阶段"
              name='stages'
              tooltip="选择量表的评估阶段（可多选）"
            >
              <CheckboxMultiSelect
                options={scaleStore.stageOptions.map(opt => opt.value)}
                optionLabels={scaleStore.stageOptions}
                maxCount={10}
              />
            </Form.Item>

            <Form.Item
              label="使用年龄"
              name='applicable_ages'
              tooltip="选择量表的适用年龄范围（可多选）"
            >
              <CheckboxMultiSelect
                options={scaleStore.applicableAgeOptions.map(opt => opt.value)}
                optionLabels={scaleStore.applicableAgeOptions}
                maxCount={10}
              />
            </Form.Item>

            <Form.Item
              label="填报人"
              name='reporters'
              tooltip="选择量表的填报人类型（可多选）"
            >
              <CheckboxMultiSelect
                options={scaleStore.reporterOptions.map(opt => opt.value)}
                optionLabels={scaleStore.reporterOptions}
                maxCount={10}
              />
            </Form.Item>

            <Form.Item
              label="标签"
              name='tags'
              tooltip="输入量表的标签（最多5个，每个标签1-50字符，只能包含字母、数字、下划线和中文）"
            >
              <Select
                mode="tags"
                placeholder="请输入标签，按回车确认"
                allowClear
                maxTagCount={5}
                tokenSeparators={[',', '，']}
                style={{ width: '100%' }}
                filterOption={false}
                notFoundContent={null}
                tagRender={(props) => {
                  const { label, closable, onClose } = props
                  return (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)',
                        border: '1px solid #13c2c2',
                        borderRadius: '6px',
                        color: '#08979c',
                        fontSize: '14px',
                        margin: '2px 4px 2px 0',
                        cursor: 'default'
                      }}
                    >
                      {label}
                      {closable && (
                        <span
                          onClick={onClose}
                          style={{ marginLeft: '6px', cursor: 'pointer' }}
                        >
                          ×
                        </span>
                      )}
                    </span>
                  )
                }}
                onInputKeyDown={(e) => {
                  // 验证输入
                  if (e.key === 'Enter' || e.key === ',') {
                    const input = e.currentTarget as HTMLInputElement
                    const value = input.value.trim()
                    if (value) {
                      // 验证标签格式：1-50字符，只能包含字母、数字、下划线和中文
                      const isValid = /^[\u4e00-\u9fa5a-zA-Z0-9_]{1,50}$/.test(value)
                      if (!isValid) {
                        e.preventDefault()
                        message.warning('标签格式不正确，只能包含字母、数字、下划线和中文，长度1-50字符')
                        input.value = ''
                      }
                    }
                  }
                }}
              />
            </Form.Item>
          </div>
        )}

        <Form.Item
          label={`${typeText}封面`}
          name='img_url'
        >
          <Input placeholder="请输入图片URL" />
        </Form.Item>
      </Form>
    </Card>
  )
})

export default BasicInfoFormCard
