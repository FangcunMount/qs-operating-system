import { matchesMenuPath } from './menuAccess'

test('home does not claim statistics and similar prefixes do not select another menu', () => {
  expect(matchesMenuPath('/', '/')).toBe(true)
  expect(matchesMenuPath('/statistics/center', '/')).toBe(false)
  expect(matchesMenuPath('/statistics/center', '/statistics/center')).toBe(true)
  expect(matchesMenuPath('/assessment/list/1', '/assessment/list')).toBe(true)
  expect(matchesMenuPath('/assessments', '/assessment')).toBe(false)
})
