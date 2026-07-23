import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, 'path')
const apiFiles = fs.readdirSync(root).filter((name) => /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts'))

describe('QS API boundary', () => {
  it('keeps QS modules out of the IAM client and rejects removed endpoint families', () => {
    const forbidden = ['../server', 'qscode', 'qsexport', '/scales/', '/api/v1/statistics', '/subject/', '/api/questionsheet/list', '/push/task']
    apiFiles
      .filter((name) => !['admin.ts', 'auth.ts', 'authz.ts', 'idp.ts', 'identity.ts', 'jwks.ts', 'loginIdentity.ts', 'user.ts'].includes(name))
      .forEach((name) => {
        const source = fs.readFileSync(path.join(root, name), 'utf8')
        forbidden.forEach((token) => expect(source).not.toContain(token))
      })
  })

  it('does not expose internal-only task completion or expiry through the public API', () => {
    const source = fs.readFileSync(path.join(root, 'plan.ts'), 'utf8')
    expect(source).not.toContain('/plans/tasks/${id}/complete')
    expect(source).not.toContain('/plans/tasks/${id}/expire')
  })
})
