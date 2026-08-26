import { getAbilityEditorProduct } from './product'

describe('ability editor product routing', () => {
  it('keeps behavior-rating and cognitive authoring state independent', () => {
    const behavioral = getAbilityEditorProduct('/behavioral-rating/info/BRIEF2')
    const cognitive = getAbilityEditorProduct('/cognitive/info/SPM')

    expect(behavioral.kind).toBe('behavioral_rating')
    expect(behavioral.basePath).toBe('/behavioral-rating')
    expect(behavioral.profiles.map((profile) => profile.algorithm)).toEqual(['brief2', 'spm_sensory'])

    expect(cognitive.kind).toBe('cognitive')
    expect(cognitive.basePath).toBe('/cognitive')
    expect(cognitive.profiles.map((profile) => profile.algorithm)).toEqual(['spm'])
    expect(cognitive.store).not.toBe(behavioral.store)
  })

  it('maps the legacy behavior-ability family to behavioral rating', () => {
    expect(getAbilityEditorProduct('/behavior-ability/definition/OLD').kind).toBe('behavioral_rating')
  })
})
