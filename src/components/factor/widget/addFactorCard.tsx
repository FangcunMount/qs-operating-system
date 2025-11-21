import React from 'react'
import { Button, Card } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'

const AddFactorCard: React.FC<AddFactorCardProps> = ({ addFactor }) => {
  return (
    <Card className="s-mt-xl s-ml-xl s-row-center" style={{ minHeight: '200px', width: '300px' }}>
      <Button
        onClick={() => {
          addFactor()
        }}
      >
        <PlusOutlined />
        添加因子
      </Button>
    </Card>
  )
}

interface AddFactorCardProps {
  addFactor: () => void
}

AddFactorCard.propTypes = {
  addFactor: PropTypes.any
}

export default AddFactorCard
