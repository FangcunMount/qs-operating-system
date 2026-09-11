import fs from 'fs'
import path from 'path'

describe('AuthZ v4 admin architecture', () => {
  const sourceRoot = path.resolve(__dirname, '../../../..')
  const files = [
    'src/api/path/authz.ts',
    'src/store/authStore.ts',
    'src/pages/admin/authz/index.tsx',
    'src/pages/admin/authz/GrantEditor.tsx',
    'src/pages/admin/resource/index.tsx',
  ]

  it('does not reintroduce retired Policy/Scope contracts', () => {
    const forbidden = [
      '/authz/policies',
      '/authz/role-inheritances',
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

  it('removes condition editing surfaces', () => {
    expect(fs.existsSync(path.join(sourceRoot, 'src/pages/admin/resource/AttributeSchemaEditor.tsx'))).toBe(false)
    expect(fs.existsSync(path.join(sourceRoot, 'src/pages/admin/authz/constraintModel.ts'))).toBe(false)
  })

  it('keeps AuthZ on v4, AuthN on v3 and Identity on v2', () => {
    const proxy = fs.readFileSync(path.join(sourceRoot, 'src/setupProxy.js'), 'utf8')
    expect(proxy).toContain('pathRewrite: path => `/api/v3${path}`')
    expect(proxy).toContain('pathRewrite: (path) => `/api/v4${path}`')
    expect(proxy).toContain('[\'/.well-known\', \'/identity\', \'/suggest\', \'/idp\']')
  })

  it('keeps wire compatibility and removes inheritance editing', () => {
    const staffApi = fs.readFileSync(path.join(sourceRoot, 'src/api/path/staff.ts'), 'utf8')
    const staffPage = fs.readFileSync(path.join(sourceRoot, 'src/pages/admin/staff/index.tsx'), 'utf8')
    expect(staffApi).toContain('effective_roles')
    expect(staffApi).toContain('inherited_roles')
    expect(staffApi).toContain('authz_projection_pending')
    expect(staffPage).toContain('直接角色')
    expect(staffPage).not.toContain('继承角色（只读预览）')
  })
})
