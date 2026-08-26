import { routes } from './map'

describe('content management model routes', () => {
  const contentRoutes = routes.find((route) => route.name === 'content')?.children || []
  const byName = (name: string) => contentRoutes.find((route) => route.name === name)

  it.each([
    ['typology-list', '/typology'],
    ['behavioral-rating-list', '/behavioral-rating'],
    ['cognitive-list', '/cognitive']
  ])('mounts %s as an exact product list', (name, path) => {
    expect(byName(name)).toMatchObject({ path, exact: true })
    expect(byName(name)?.component).toBeDefined()
  })

  it.each([
    ['typology', 'typology-list'],
    ['behavioral-rating', 'behavioral-rating-list'],
    ['cognitive', 'cognitive-list']
  ])('mounts the complete five-step %s editor flow', (family, activeMenuName) => {
    expect(byName(`${family}-info`)).toMatchObject({ path: `/${family}/info/:modelCode`, activeMenuName })
    expect(byName(`${family}-create`)).toMatchObject({ path: `/${family}/create/:modelCode/:answercnt`, activeMenuName })
    expect(byName(`${family}-routing`)).toMatchObject({ path: `/${family}/routing/:modelCode`, activeMenuName })
    expect(byName(`${family}-definition`)).toMatchObject({ path: `/${family}/definition/:modelCode`, activeMenuName })
    expect(byName(`${family}-publish`)).toMatchObject({ path: `/${family}/publish/:modelCode`, activeMenuName })
  })

  it('keeps the canonical and legacy norm-table entries reachable', () => {
    expect(byName('behavior-ability-norm-tables')?.path).toBe('/behavioral-rating/norm-tables')
    expect(byName('legacy-behavior-ability-norm-tables')?.path).toBe('/behavior-ability/norm-tables')
  })
})
