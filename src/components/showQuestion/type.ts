import PropTypes from 'prop-types'

export interface IQuestionProps<Q, A> {
  item: Q | A
  title: string
  isSelect: boolean
  onClick: () => void
}

export const questionPropTypes = {
  item: PropTypes.any,
  title: PropTypes.any,
  isSelect: PropTypes.any,
  onClick: PropTypes.any
}