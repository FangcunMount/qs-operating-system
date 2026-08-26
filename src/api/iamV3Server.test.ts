import { resolveIamV3BaseURL } from './iamV3Server'

describe('IAM v3 client base URL', () => {
  const originalHost = process.env.REACT_APP_IAM_HOST

  afterEach(() => {
    if (originalHost === undefined) {
      delete process.env.REACT_APP_IAM_HOST
    } else {
      process.env.REACT_APP_IAM_HOST = originalHost
    }
  })

  it('replaces a configured IAM v2 suffix without changing the origin', () => {
    process.env.REACT_APP_IAM_HOST = 'https://iam.example.com/api/v2/'
    expect(resolveIamV3BaseURL()).toBe('https://iam.example.com/api/v3')
  })

  it('appends v3 when the configured host has no API suffix', () => {
    process.env.REACT_APP_IAM_HOST = 'https://iam.example.com'
    expect(resolveIamV3BaseURL()).toBe('https://iam.example.com/api/v3')
  })
})
