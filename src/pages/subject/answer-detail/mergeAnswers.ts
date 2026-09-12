import { IAnswer } from '@/models/answerSheet'
import { IQuestion } from '@/models/question'

// 合并答案与题目信息
export const mergeAnswersWithQuestions = (
  answers: any[],
  questions: IQuestion[]
): IAnswer[] => {
  // 创建题目映射表（按 question_code）
  const questionMap = new Map<string, IQuestion>()
  questions.forEach(q => {
    questionMap.set(q.code, q)
  })

  // 合并答案与题目信息
  return answers.map((answer: any) => {
    const question = questionMap.get(answer.question_code)
    if (!question) {
      // 如果找不到题目信息，返回基础答案对象
      return {
        question_code: answer.question_code,
        title: `题目 ${answer.question_code}（历史题目信息不可用）`,
        type: 'Text',
        placeholder: '',
        tips: '',
        show_controller: { questions: [], rule: 'and' },
        value: Array.isArray(answer.value) ? answer.value.join('、') : String(answer.value ?? '')
      } as IAnswer
    }

    // 将题目信息转换为答案格式
    const mergedAnswer: any = {
      question_code: question.code,
      title: question.title,
      type: question.type,
      tips: question.tips || '',
      show_controller: question.show_controller || { questions: [], rule: 'and' }
    }

    // 根据题目类型处理答案值
    if (answer.question_type === 'Radio' || answer.question_type === 'Checkbox') {
      // 选择题：需要标记选中的选项
      const selectedValues = Array.isArray(answer.value) ? answer.value : [answer.value]
      if ('options' in question && question.options) {
        mergedAnswer.options = question.options.map((opt: any) => ({
          ...opt,
          is_select: selectedValues.includes(opt.code) ? '1' : '0'
        }))
      }
    } else if (answer.question_type === 'Text' || answer.question_type === 'Textarea') {
      // 文本题：直接使用值
      mergedAnswer.value = answer.value || ''
      if ('placeholder' in question) {
        mergedAnswer.placeholder = question.placeholder || ''
      }
    } else if (answer.question_type === 'Number') {
      // 数字题
      mergedAnswer.value = answer.value || ''
      if ('placeholder' in question) {
        mergedAnswer.placeholder = question.placeholder || ''
      }
    } else if (answer.question_type === 'Date') {
      // 日期题
      mergedAnswer.value = answer.value || ''
      mergedAnswer.format = 'YYYY-MM-DD'
    } else {
      // 其他类型
      mergedAnswer.value = answer.value || ''
    }

    return mergedAnswer as IAnswer
  })
}

