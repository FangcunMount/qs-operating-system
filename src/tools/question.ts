import React from 'react'

import { IQuestion, IQuestionType } from '@/models/question'

import SettingRadio from '../pages/qs/edit/widget/radio/Setting'
import SettingSection from '@/pages/qs/edit/widget/section/Setting'
import SettingCheckBox from '@/pages/qs/edit/widget/checkBox/Setting'
import SettingSelect from '@/pages/qs/edit/widget/select/Setting'
import SettingScore from '@/pages/qs/edit/widget/score/Setting'
import SettingText from '@/pages/qs/edit/widget/text/Setting'
import SettingTextarea from '@/pages/qs/edit/widget/textarea/Setting'
import SettingNumber from '@/pages/qs/edit/widget/number/Setting'
import SettingDate from '@/pages/qs/edit/widget/date/Setting'
import SettingImageRadio from '@/pages/qs/edit/widget/imageRadio/Setting'
import SettingImageCheckBox from '@/pages/qs/edit/widget/imageCheckBox/Setting'
import SettingUpload from '@/pages/qs/edit/widget/upload/Setting'

// // 未开发题型
// import SettingAddressSelect from './widget/addressSelect/Setting'
// import SettingCascaderSelect from './widget/cascaderSelect/Setting'
// import SettingImageMatrixCheckBox from './widget/imageMatrixCheckBox/Setting'
// import SettingImageMatrixRadio from './widget/imageMatrixRadio/Setting'
// import SettingMatrixCheckBox from './widget/matrixCheckBox/Setting'
// import SettingMatrixRadio from './widget/matrixRadio/Setting'

import ShowSection from '@/components/showQuestion/ShowSection'
import ShowRadio from '@/components/showQuestion/ShowRadio'
import ShowCheckBox from '@/components/showQuestion/ShowCheckBox'
import ShowSelect from '@/components/showQuestion/ShowSelect'
import ShowScore from '@/components/showQuestion/ShowScore'
import ShowText from '@/components/showQuestion/ShowText'
import ShowTextarea from '@/components/showQuestion/ShowTextarea'
import ShowNumber from '@/components/showQuestion/ShowNumber'
import ShowDate from '@/components/showQuestion/ShowDate'
import ShowImageRadio from '@/components/showQuestion/ShowImageRadio'
import ShowImageCheckBox from '@/components/showQuestion/ShowImageCheckBox'
import ShowUpload from '@/components/showQuestion/ShowUpload'

// // 未开发题型
// import ShowAddressSelect from '@/components/showQuestion/ShowAddressSelect'
// import ShowCascaderSelect from '@/components/showQuestion/ShowCascaderSelect'
// import ShowImageMatrixCheckBox from '@/components/showQuestion/ShowImageMatrixCheckBox'
// import ShowImageMatrixRadio from '@/components/showQuestion/ShowImageMatrixRadio'
// import ShowMatrixCheckBox from '@/components/showQuestion/ShowMatrixCheckBox'
// import ShowMatrixRadio from '@/components/showQuestion/ShowMatrixRadio'

import NullComp from '../pages/qs/edit/widget/Null'
import { IAnswer } from '@/models/answerSheet'
import { boolToOneZero, isArray, isObject, oneZeroToBool } from '@/utils'
import { GLOBAL_CONSTANT } from '@/utils/variables'
import { IAnyObj } from '@/types/base'

type IAnyReactEl = React.FC<any>
type deepTraversalCallback = (k: string, v: any) => any
interface IDefaultField {
  min_words: number
  max_words: number
  min_value: number
  max_value: number
  min_select: number
  max_select: number
}
const needTransformField = ['allow_extend_text', 'is_other', 'required', 'allow_upload_image', 'allow_upload_video']
const defaultField: IDefaultField = {
  min_words: GLOBAL_CONSTANT.min.words,
  max_words: GLOBAL_CONSTANT.max.words,
  min_value: GLOBAL_CONSTANT.min.number,
  max_value: GLOBAL_CONSTANT.max.number,
  min_select: GLOBAL_CONSTANT.min.select,
  max_select: GLOBAL_CONSTANT.max.select
}

function deepTraversal(target: unknown, callback: deepTraversalCallback) {
  if (isObject(target)) {
    const tmp: IAnyObj = { ...(target as IAnyObj) }
    Object.keys(tmp).forEach((k) => {
      if (isObject(tmp[k]) || isArray(tmp[k])) {
        tmp[k] = deepTraversal(tmp[k], callback)
      } else {
        tmp[k] = callback(k, tmp[k])
      }
    })

    return tmp
  }

  if (isArray(target)) {
    return (target as Array<any>).map((v): any => {
      return deepTraversal(v, callback)
    })
  }

  return target
}

class Question {
  get settingComponent() {
    return NullComp
  }

  get showComponent() {
    return NullComp
  }

  apiToData(question: IQuestion): any {
    return question
  }
}

class RadioQuestion extends Question {
  get settingComponent() {
    return SettingRadio as IAnyReactEl
  }

  get showComponent() {
    return ShowRadio as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { required: oneZeroToBool(question.validate_rules?.required) }
    }
  }
}

class SectionQuestion extends Question {
  get settingComponent() {
    return SettingSection as IAnyReactEl
  }

  get showComponent() {
    return ShowSection as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return question
  }
}

class CheckBoxQueestion extends Question {
  get settingComponent() {
    return SettingCheckBox as IAnyReactEl
  }

  get showComponent() {
    return ShowCheckBox as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: {
        required: oneZeroToBool(question.validate_rules?.required),
        min_select: question.validate_rules?.min_select || GLOBAL_CONSTANT.min.select,
        max_select: question.validate_rules?.max_select || GLOBAL_CONSTANT.max.select
      }
    }
  }
}

class SelectQuestion extends Question {
  get settingComponent() {
    return SettingSelect as IAnyReactEl
  }

  get showComponent() {
    return ShowSelect as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { required: oneZeroToBool(question.validate_rules?.required) }
    }
  }
}

class ScoreQuestion extends Question {
  get settingComponent() {
    return SettingScore as IAnyReactEl
  }

  get showComponent() {
    return ShowScore as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { required: oneZeroToBool(question.validate_rules?.required) }
    }
  }
}

class TextQuestion extends Question {
  get settingComponent() {
    return SettingText as IAnyReactEl
  }

  get showComponent() {
    return ShowText as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: {
        required: oneZeroToBool(question.validate_rules?.required),
        min_words: question.validate_rules?.min_words || GLOBAL_CONSTANT.min.words,
        max_words: question.validate_rules?.max_words || GLOBAL_CONSTANT.max.words
      }
    }
  }
}

class TextareaQuestion extends Question {
  get settingComponent() {
    return SettingTextarea as IAnyReactEl
  }

  get showComponent() {
    return ShowTextarea as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: {
        required: oneZeroToBool(question.validate_rules?.required),
        min_words: question.validate_rules?.min_words ?? GLOBAL_CONSTANT.min.words,
        max_words: question.validate_rules?.max_words ?? GLOBAL_CONSTANT.max.words
      }
    }
  }
}

class NumberQuestion extends Question {
  get settingComponent() {
    return SettingNumber as IAnyReactEl
  }

  get showComponent() {
    return ShowNumber as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: {
        required: oneZeroToBool(question.validate_rules?.required),
        min_value: question.validate_rules?.min_value ?? GLOBAL_CONSTANT.min.number,
        max_value: question.validate_rules?.max_value ?? GLOBAL_CONSTANT.max.number
      }
    }
  }
}

class DateQuestion extends Question {
  get settingComponent() {
    return SettingDate as IAnyReactEl
  }

  get showComponent() {
    return ShowDate as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { required: oneZeroToBool(question.validate_rules?.required) }
    }
  }
}

class ImageRadioQuestion extends Question {
  get settingComponent() {
    return SettingImageRadio as IAnyReactEl
  }

  get showComponent() {
    return ShowImageRadio as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { required: oneZeroToBool(question.validate_rules?.required) }
    }
  }
}

class ImageCheckBoxQuestion extends Question {
  get settingComponent() {
    return SettingImageCheckBox as IAnyReactEl
  }

  get showComponent() {
    return ShowImageCheckBox as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { 
        required: oneZeroToBool(question.validate_rules?.required),
        min_select: question.validate_rules?.min_select || GLOBAL_CONSTANT.min.select,
        max_select: question.validate_rules?.max_select || GLOBAL_CONSTANT.max.select
      },

    }
  }
}

class UploadQuestion extends Question {
  get settingComponent() {
    return SettingUpload as IAnyReactEl
  }

  get showComponent() {
    return ShowUpload as IAnyReactEl
  }

  apiToData(question: IQuestion) {
    return {
      ...question,
      validate_rules: { 
        required: oneZeroToBool(question.validate_rules?.required),
        allow_upload_image: oneZeroToBool(question.validate_rules?.allow_upload_image),
        allow_upload_video: oneZeroToBool(question.validate_rules?.allow_upload_video)
      },

    }
  }
}

function createQuestion(type: IQuestionType | null | undefined): Question {
  switch (type) {
  case 'Section':
    return new SectionQuestion()
  case 'Text':
    return new TextQuestion()
  case 'Textarea':
    return new TextareaQuestion()
  case 'Number':
    return new NumberQuestion()
  case 'Date':
    return new DateQuestion()
  case 'Radio':
    return new RadioQuestion()
  case 'CheckBox':
    return new CheckBoxQueestion()
  case 'Select':
    return new SelectQuestion()
  case 'ScoreRadio':
    return new ScoreQuestion()
  case 'ImageRadio':
    return new ImageRadioQuestion()
  case 'ImageCheckBox':
    return new ImageCheckBoxQuestion()
  case 'Upload':
    return new UploadQuestion()
  default:
    return new Question()
  }
}

export function getSettingComponent(question: IQuestion): IAnyReactEl {
  return createQuestion(question?.type).settingComponent
}

export function getShowComponent(question: IQuestion | IAnswer): IAnyReactEl {
  return createQuestion(question.type).showComponent
}

export function apiToData(question: IQuestion): IQuestion {
  question = deepTraversal(question, (k: string, v) => {
    if (needTransformField.includes(k)) {
      return oneZeroToBool(v)
    }

    return v
  }) as IQuestion
  return createQuestion(question.type).apiToData(question)
}

export function dataToApi(question: IQuestion): IQuestion {
  question = deepTraversal(question, (k: string, v) => {
    if (needTransformField.includes(k)) {
      return boolToOneZero(v)
    }

    if (Object.prototype.hasOwnProperty.call(defaultField, k)) {
      return String(v ?? defaultField[k as keyof IDefaultField])
    }

    return v
  }) as IQuestion

  return question
}
