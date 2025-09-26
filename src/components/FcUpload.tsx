import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import type { UploadProps } from 'antd'
import { Upload, message } from 'antd'
import { IOSSSignature, getOSSSignature, saveUploadImageFile } from '@/api/path/oss'

import './fcUpload.scss'
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import { uuid } from '@/utils'

const sceneType = 'wenjuan'

const FcUpload: React.FC<FcUploadProps> = ({ value, realativePath, onChange }) => {
  const [loading, setLoading] = useState(false)
  const [OSSData, setOSSData] = useState<IOSSSignature>()

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const [, r] = await getOSSSignature(`${sceneType}/${realativePath}`)
    r && setOSSData(r.data)
  }

  const handleChange: UploadProps['onChange'] = async ({ file }) => {
    if (file.status === 'done') {
      const [e, r] = await saveUploadImageFile({
        name: file.name,
        pathname: file.url as string,
        scene_type: sceneType
      })

      if (!e && r) {
        onChange?.(r.data.url)
      } else {
        message.error(e.errmsg)
      }

      setLoading(false)
    }
  }

  const onRemove = () => {
    if (onChange) {
      onChange(null)
    }
  }

  const getExtraData: UploadProps['data'] = (file) => ({
    key: file.url,
    OSSAccessKeyId: OSSData?.accessid,
    policy: OSSData?.policy,
    Signature: OSSData?.signature,
    'x-oss-object-acl': 'public-read',
    success_action_status: '200'
  })

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!OSSData) return false

    const expire = Number(OSSData.expire) * 1000

    if (expire < Date.now()) {
      await init()
    }

    const suffix = file.name.slice(file.name.lastIndexOf('.'))
    const filename = Date.now() + suffix
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    file.url = OSSData.dir + filename

    setLoading(true)
    return file
  }

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  )

  return (
    <Upload
      name="file"
      accept="image/*"
      maxCount={1}
      defaultFileList={value ? [{ uid: uuid(), name: 'null', url: value.url }] : []}
      listType="picture-card"
      action={OSSData?.host}
      showUploadList={false}
      onChange={handleChange}
      onRemove={onRemove}
      data={getExtraData}
      beforeUpload={beforeUpload}
    >
      {value ? <img src={value.url} alt="avatar" style={{ width: '100%' }} /> : uploadButton}
    </Upload>
  )
}

interface FcUploadProps {
  value: { url: string } | null
  realativePath: string
  onChange?: (url: string | null) => void
}

FcUpload.propTypes = {
  value: PropTypes.any,
  realativePath: PropTypes.any,
  onChange: PropTypes.any
}

export default FcUpload
