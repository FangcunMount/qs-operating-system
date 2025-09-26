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
    domain: 'fangcunhulian.cn',
    appID: 'wwb454f1d5286955cb',
    agentID: '1000025'
  },

  development: {
    token: '',
    dev: '?dev_user=' + 'www' + '&display=json',
    host: '//adwenjuan.fangcunhulian.cn',
    ossHost: 'https://api.fangcunyisheng.com',
    domain: 'fangcunhulian.cn',
    appID: 'wwb454f1d5286955cb',
    agentID: '1000025'
  },

  production: {
    token: '',
    dev: '?display=json',
    host: '//adwenjuan.fangcunyisheng.com',
    ossHost: 'https://api.fangcunyisheng.com',
    domain: 'fangcunyisheng.com',
    appID: 'ww6f0fda0b94f5df88',
    agentID: '1000040'
  }
}

// 通过链接获取当前环境
function getDevType(): keyof IConfigMap {
  switch (location.host) {
  case 'adwenjuan.fangcunyisheng.com':
    return 'production'

  case 'adwenjuan.fangcunhulian.cn':
    return 'development'

  default:
    return 'local'
  }
}

export const environment = getDevType()
export const config = configMap[environment]
