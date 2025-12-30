module.exports = {
  'env': {
    'browser': true,
    'es2021': true,
    'node': true
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaFeatures': {
      'jsx': true
    },
    'ecmaVersion': 12,
    'sourceType': 'module'
  },
  'plugins': [
    'react',
    '@typescript-eslint'
  ],
  'settings': {
    'react': {
      'version': 'detect'
    }
  },
  'rules': {
    '@typescript-eslint/no-explicit-any': ['off'],
    'react/prop-types': ['off'],
    'react/react-in-jsx-scope': ['off'], // React 17+ 不需要导入 React
    'react/jsx-uses-react': ['off'], // React 17+ 不需要导入 React
    'indent': [
      'error',
      2
    ],
    // 'linebreak-style': [
    //   'error',
    //   'windows'
    // ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'never'
    ],
    'max-len': ['error', { code: 150 }]
  }
}
