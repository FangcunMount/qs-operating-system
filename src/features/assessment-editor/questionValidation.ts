import type { IQuestion } from '@/models/question'
import { checkAddressSelect } from '@/components/questionEdit/widget/addressSelect/Setting'
import { checkCascaderSelect } from '@/components/questionEdit/widget/cascaderSelect/Setting'
import { checkCheckBox } from '@/components/questionEdit/widget/checkBox/Setting'
import { checkDate } from '@/components/questionEdit/widget/date/Setting'
import { checkImageCheckBox } from '@/components/questionEdit/widget/imageCheckBox/Setting'
import { checkImageRadio } from '@/components/questionEdit/widget/imageRadio/Setting'
import { checkNumber } from '@/components/questionEdit/widget/number/Setting'
import { checkRadio } from '@/components/questionEdit/widget/radio/Setting'
import { checkScoreRadio } from '@/components/questionEdit/widget/score/Setting'
import { checkSection } from '@/components/questionEdit/widget/section/Setting'
import { checkSelect } from '@/components/questionEdit/widget/select/Setting'
import { checkText } from '@/components/questionEdit/widget/text/Setting'
import { checkTextarea } from '@/components/questionEdit/widget/textarea/Setting'
import { checkUpload } from '@/components/questionEdit/widget/upload/Setting'

type QuestionChecker = (question: any, index: number) => boolean

const defaultCheckers: Record<string, QuestionChecker> = {
  Text: checkText,
  Radio: checkRadio,
  Section: checkSection,
  Textarea: checkTextarea,
  Number: checkNumber,
  Date: checkDate,
  CheckBox: checkCheckBox,
  Checkbox: checkCheckBox,
  ScoreRadio: checkScoreRadio,
  Select: checkSelect,
  AddressSelect: checkAddressSelect,
  CascaderSelect: checkCascaderSelect,
  ImageCheckBox: checkImageCheckBox,
  ImageRadio: checkImageRadio,
  Upload: checkUpload
}

export const LEGACY_REMOVED_QUESTION_TYPES = new Set(['MatrixCheckBox', 'MatrixRadio', 'ImageMatrixCheckBox', 'ImageMatrixRadio'])

export interface QuestionValidationOptions {
  skippedTypes?: ReadonlySet<string>
  onSkipped?: (question: IQuestion, index: number) => void
  onValidated?: (question: IQuestion, index: number) => void
}

/** The checker map keeps existing validation semantics; presentation is injected
 * by callers instead of embedding product-specific UI in the shared helper. */
export const validateQuestionList = (questions: IQuestion[], options: QuestionValidationOptions = {}): boolean => {
  const skippedTypes = options.skippedTypes || new Set<string>()
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]
    if (skippedTypes.has(question.type)) {
      options.onSkipped?.(question, index)
      continue
    }
    const checker = defaultCheckers[question.type]
    if (!checker || !checker(question, index)) return false
    options.onValidated?.(question, index)
  }
  return true
}
