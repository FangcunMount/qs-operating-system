import { get, post } from '../qsServer'
import { normTableApi } from './normTable'

jest.mock('../qsServer', () => ({
  get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  post: jest.fn(() => Promise.resolve([null, { data: {} }]))
}))

describe('normTableApi', () => {
  it('uses the versioned norm-table routes without client-side data reshaping', async () => {
    const payload = {
      table_version: 'brief2-parent-2026',
      form_variant: 'parent',
      kind: 'behavioral_rating',
      algorithm: 'brief2',
      factors: []
    }
    await normTableApi.importNormTable(payload)
    await normTableApi.listNormTables({ kind: 'behavioral_rating', algorithm: 'brief2', form_variant: 'parent' })
    await normTableApi.getNormTable('brief2-parent-2026')

    expect(post).toHaveBeenCalledWith('/norm-tables', payload)
    expect(get).toHaveBeenCalledWith('/norm-tables', { kind: 'behavioral_rating', algorithm: 'brief2', form_variant: 'parent' })
    expect(get).toHaveBeenCalledWith('/norm-tables/brief2-parent-2026')
  })
})
