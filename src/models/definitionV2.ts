/**
 * The AssessmentModel DefinitionV2 wire contract deliberately keeps the
 * server's PascalCase field names.  Editors work on projections of this
 * object, but PUT must always send the complete object back unchanged apart
 * from fields owned by the current editor.
 */
export type DefinitionV2Record = Record<string, unknown>

export interface DefinitionFactor extends DefinitionV2Record {
  Code: string
  Title?: string
  Role?: string
}

export interface DefinitionFactorEdge extends DefinitionV2Record {
  ParentCode: string
  ChildCode: string
}

export interface DefinitionFactorGraph extends DefinitionV2Record {
  Roots?: string[]
  Edges?: DefinitionFactorEdge[]
  SortOrders?: Record<string, number>
}

export interface DefinitionScoringSource extends DefinitionV2Record {
  Kind: 'question' | 'factor' | string
  Code: string
  ScoringMode?: 'question_score' | 'option_override' | string
  Sign?: number
  Weight?: number
  OptionScores?: Record<string, number>
}

export interface DefinitionScoring extends DefinitionV2Record {
  FactorCode: string
  Sources?: DefinitionScoringSource[]
  Strategy?: string
  Weights?: Record<string, number>
  Constant?: number
  MaxScore?: number
  OptionScoring?: string
  Params?: DefinitionV2Record
}

export interface DefinitionMeasure extends DefinitionV2Record {
  Factors?: DefinitionFactor[]
  FactorGraph?: DefinitionFactorGraph
  Scoring?: DefinitionScoring[]
}

export interface DefinitionNormRef extends DefinitionV2Record {
  FactorCode: string
  NormTableVersion: string
}

export interface DefinitionCalibration extends DefinitionV2Record {
  NormRefs?: DefinitionNormRef[]
}

export interface DefinitionBrief2Execution extends DefinitionV2Record {
  FormVariant: string
  PrimaryFactorCode: string
  IndexFactorCodes?: string[]
  ValidityFactorCodes?: string[]
}

export interface DefinitionSPMItem extends DefinitionV2Record {
  QuestionCode: string
  CorrectOptionCode: string
}

export interface DefinitionSPMItemSet extends DefinitionV2Record {
  Code: string
  Items: DefinitionSPMItem[]
}

export interface DefinitionSPMExecution extends DefinitionV2Record {
  TimeLimitSeconds: number
  TotalFactorCode: string
  ItemSets: DefinitionSPMItemSet[]
}

/** Algorithm-specific execution settings. Keep this PascalCase structure
 * intact because DefinitionV2 is sent back as a complete source document. */
export interface DefinitionExecution extends DefinitionV2Record {
  Brief2?: DefinitionBrief2Execution
  SPM?: DefinitionSPMExecution
}

export interface DefinitionOutcome extends DefinitionV2Record {
  Code: string
  Title?: string
  Summary?: string
  Description?: string
}

export interface DefinitionReportSection extends DefinitionV2Record {
  Code?: string
  Kind?: string
  Title?: string
  SourceRefs?: string[]
  AdapterKey?: string
  TemplateID?: string
  TemplateVersion?: string
  CategoryLabel?: string
}

export interface DefinitionReportMap extends DefinitionV2Record {
  Sections?: DefinitionReportSection[]
}

export interface DefinitionConclusion extends DefinitionV2Record {
  Kind: 'risk' | 'type' | 'norm' | 'ability' | string
}

export interface DefinitionV2 extends DefinitionV2Record {
  Measure?: DefinitionMeasure
  Calibration?: DefinitionCalibration
  Execution?: DefinitionExecution
  Conclusions?: DefinitionConclusion[]
  Outcomes?: DefinitionOutcome[]
  ReportMap?: DefinitionReportMap
}

export const createEmptyDefinitionV2 = (): DefinitionV2 => ({
  Measure: { Factors: [], FactorGraph: { Roots: [], Edges: [] }, Scoring: [] },
  Calibration: { NormRefs: [] },
  Conclusions: [],
  Outcomes: [],
  ReportMap: { Sections: [] }
})

export const isDefinitionV2 = (value: unknown): value is DefinitionV2 => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

/** API payloads are JSON, so a JSON clone safely prevents editor mutations from
 * mutating the retained server source object. */
export const cloneDefinitionV2 = (definition: DefinitionV2): DefinitionV2 => (
  JSON.parse(JSON.stringify(definition)) as DefinitionV2
)
