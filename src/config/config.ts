interface IConfig {
  dev: string
  host: string
  domain: string
  token?: string
}
interface IConfigMap {
  local: IConfig
  development: IConfig
  production: IConfig
}

// Mock 地址 ： 'https://mockapi.eolinker.com/VSRnDuC52a14e4cc405c00d4d526bb3baaf1fd4c32e9f74',
// 环境映射
const configMap = {
  local: {
    token: '',
    dev: '?dev_user=' + 'www' + '&display=json',
    host: '',
    ossHost: '',
    domain: 'yangshujie.com',
    appID: 'wwb454f1d5286955cb',
    agentID: '1000025'
  },

  development: {
    token: '',
    dev: '?dev_user=' + 'www' + '&display=json',
    host: '//adwenjuan.yangshujie.com',
    ossHost: 'https://api.yangshujie.com',
    domain: 'yangshujie.com',
    appID: 'wwb454f1d5286955cb',
    agentID: '1000025'
  },

  production: {
    token: '',
    dev: '?display=json',
    host: '//adwenjuan.yangshujie.com',
    ossHost: 'https://api.yangshujie.com',
    domain: 'yangshujie.com',
    appID: 'ww6f0fda0b94f5df88',
    agentID: '1000040'
  }
}

// 通过链接获取当前环境
function getDevType(): keyof IConfigMap {
  switch (location.host) {
  case 'adwenjuan.yangshujie.com':
    return 'production'

  default:
    return 'local'
  }
}

export const environment = getDevType()
export const config = configMap[environment]
