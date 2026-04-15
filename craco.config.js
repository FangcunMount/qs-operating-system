// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^fc-tools-pc/dist/bundle$': '<rootDir>/src/test/mocks/fcToolsPcBundle.ts'
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
    }
  }
}
