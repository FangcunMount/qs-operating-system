import React from 'react'
import 'antd/dist/antd.css'

import RouteView from './router/router'
import './App.scss'

const App: React.FC = () => {
  return (
    <div className="App">
      <div style={{ flexGrow: 1, height: 'auto', overflow: 'hidden' }}>
        <RouteView></RouteView>
      </div>
    </div>
  )
}

export default App
