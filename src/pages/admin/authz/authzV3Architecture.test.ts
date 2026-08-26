import fs from 'fs'
import path from 'path'

describe('AuthZ v3 admin architecture', () => {
  const sourceRoot = path.resolve(__dirname, '../../../..')
  const files = [
    'src/api/path/authz.ts',
    'src/store/authStore.ts',
    'src/pages/admin/authz/index.tsx',
    'src/pages/admin/authz/GrantEditor.tsx',
    'src/pages/admin/resource/index.tsx',
    'src/pages/admin/resource/AttributeSchemaEditor.tsx'
  ]

  it('does not reintroduce retired Policy/Scope contracts', () => {
    const forbidden = [
      '/authz/policies',
      'scope_kinds',
      'scope_type',
      'scope_value',
      'currentRolePolicies',
      'addPolicyRule'
    ]
    files.forEach((file) => {
      const source = fs.readFileSync(path.join(sourceRoot, file), 'utf8')
      forbidden.forEach(token => expect(source).not.toContain(token))
    })
  })

  it('keeps AuthZ on v3 while the remaining IAM proxy stays on v2', () => {
    const proxy = fs.readFileSync(path.join(sourceRoot, 'src/setupProxy.js'), 'utf8')
    expect(proxy).toContain('pathRewrite: (path) => `/api/v3${path}`')
    expect(proxy).toContain('[\'/.well-known\', \'/authn\', \'/identity\', \'/suggest\', \'/idp\']')
  })
})
