/* eslint-disable react/react-in-jsx-scope */
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App'

import zhCN from 'antd/es/locale/zh_CN'
import { ConfigProvider } from 'antd'
import 'moment/locale/zh-cn'
import moment from 'moment'
import { initConfig } from 'fc-tools-pc/dist/bundle'
import { config } from './config/config'
moment.locale('zh-cn')
// 适配 fc-tools-pc 旧 IConfig 形状（需要 dev 字段）
const legacyConfig = { ...config, dev: '' } as any
initConfig(legacyConfig, 'qs')

ReactDOM.render(
  <BrowserRouter>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </BrowserRouter>,
  document.getElementById('root')
)
