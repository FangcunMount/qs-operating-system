import { makeObservable, observable, action } from 'mobx'
import { IFactorAnalysis, IInterpretation, IInterpret_rule, IMacroAnalysis } from '../models/analysis'

const initMacroRule: IMacroAnalysis = {
  max_score: 0,
  interpretation: []
}

const factor_rules: Array<IFactorAnalysis> = []
export const analysisStore = makeObservable(
  {
    macro_rule: initMacroRule,
    factor_rules: factor_rules,

    initData(m: IMacroAnalysis | undefined, fs: Array<IFactorAnalysis>) {
      if (m) {
        this.macro_rule = m ?? initMacroRule
      }
      this.factor_rules = fs ?? []
    },

    getIndexByCode(code: string) {
      return this.factor_rules.findIndex((v) => v.code === code)
    },

    changeMacroRule(k: keyof IMacroAnalysis, v: any) {
      (this.macro_rule[k] as any) = v
    },

    changeMacroRuleInterpretation(i: number, v: IInterpretation) {
      this.macro_rule.interpretation[i] = v
    },

    addMacroRuleInterpretation() {
      this.macro_rule.interpretation.push({ start: '', end: '', content: '' })
    },

    delMacroRuleInterpretation(i: number) {
      this.macro_rule.interpretation.splice(i, 1)
    },

    changeFactorRulesItem(code: string, k: keyof IInterpret_rule, v: any) {
      const i = this.getIndexByCode(code);
      (this.factor_rules[i].interpret_rule[k] as any) = v
    },

    changeFactorRulesInterpretation(code: string, i: number, v: IInterpretation) {
      const fi = this.getIndexByCode(code)
      this.factor_rules[fi].interpret_rule.interpretation[i] = v
    },

    addFactorRulesInterpretation(code: string) {
      const fi = this.getIndexByCode(code)
      this.factor_rules[fi].interpret_rule.interpretation.push({ start: '', end: '', content: '' })
    },

    delFactorRulesInterpretation(code: string, i: number) {
      const fi = this.getIndexByCode(code)
      this.factor_rules[fi].interpret_rule.interpretation.splice(i, 1)
    }
  },
  {
    macro_rule: observable,
    factor_rules: observable,
    initData: action,
    changeMacroRule: action,
    changeMacroRuleInterpretation: action,
    addMacroRuleInterpretation: action,
    delMacroRuleInterpretation: action,
    changeFactorRulesItem: action,
    changeFactorRulesInterpretation: action,
    addFactorRulesInterpretation: action,
    delFactorRulesInterpretation: action,
  }
)
