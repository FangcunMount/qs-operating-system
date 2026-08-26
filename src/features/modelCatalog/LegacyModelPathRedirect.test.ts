import { buildLegacyModelTarget } from './LegacyModelPathRedirect'

describe('buildLegacyModelTarget', () => {
  it('maps legacy list and editor paths to the canonical typology family', () => {
    expect(buildLegacyModelTarget('/personality/list')).toBe('/typology')
    expect(buildLegacyModelTarget('/personality/definition/T1', '?tab=report')).toBe('/typology/definition/T1?tab=report')
  })

  it('keeps behavior and cognitive models in separate canonical families', () => {
    expect(buildLegacyModelTarget('/behavior-ability/list')).toBe('/behavioral-rating')
    expect(buildLegacyModelTarget('/behavior-ability/info/new')).toBe('/behavioral-rating/info/new')
    expect(buildLegacyModelTarget('/behavior-ability/publish/C1', '', 'cognitive')).toBe('/cognitive/publish/C1')
  })

  it('preserves the legacy norm-table entry', () => {
    expect(buildLegacyModelTarget('/behavior-ability/norm-tables')).toBe('/behavioral-rating/norm-tables')
  })
})
