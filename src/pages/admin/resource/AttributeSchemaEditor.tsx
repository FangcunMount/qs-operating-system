import React from 'react'
import { Button, Form, Input, Select, Space, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'

const { Option } = Select
const { Text } = Typography

const ATTRIBUTE_KEY_PATTERN = /^object\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/

const AttributeSchemaEditor: React.FC = () => (
  <Form.List name="attributes">
    {(fields, { add, remove }) => (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {fields.map(field => (
          <div className="attribute-schema-row" key={field.key}>
            <Form.Item
              {...field}
              label="属性键"
              name={[field.name, 'key']}
              fieldKey={[field.fieldKey, 'key']}
              rules={[
                { required: true, message: '请输入属性键' },
                { pattern: ATTRIBUTE_KEY_PATTERN, message: '必须是 object.xxx 格式' }
              ]}
            >
              <Input placeholder="例如 object.origin_type" />
            </Form.Item>
            <Form.Item
              {...field}
              label="类型"
              name={[field.name, 'type']}
              fieldKey={[field.fieldKey, 'type']}
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select placeholder="属性类型">
                <Option value="string">string</Option>
                <Option value="int64">int64</Option>
                <Option value="bool">bool</Option>
              </Select>
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const attributes = getFieldValue('attributes') || []
                const type = attributes[field.name]?.type
                return type === 'string' ? (
                  <Form.Item
                    label="允许的字符串值"
                    name={[field.name, 'allowed_string_values']}
                    fieldKey={[field.fieldKey, 'allowed_string_values']}
                  >
                    <Select
                      mode="tags"
                      tokenSeparators={[',']}
                      open={false}
                      placeholder="可选；输入后回车"
                    />
                  </Form.Item>
                ) : <div className="attribute-schema-placeholder" />
              }}
            </Form.Item>
            <Button
              className="attribute-schema-delete"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => remove(field.name)}
            >
              删除
            </Button>
          </div>
        ))}
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          disabled={fields.length >= 32}
          onClick={() => add({ type: 'string' })}
        >
          添加对象属性
        </Button>
        <Text type="secondary">
          Schema v1 仅支持对象属性、EQ 和 string/int64/bool；空 Schema 表示该资源只能创建无条件 Grant。
        </Text>
      </Space>
    )}
  </Form.List>
)

export default AttributeSchemaEditor
