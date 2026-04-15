const fs = require('fs')
const path = require('path')

const distDir = path.resolve(__dirname, '..', 'dist')
const versionFile = path.join(distDir, 'version.json')

if (!fs.existsSync(distDir)) {
  throw new Error(`dist directory not found: ${distDir}`)
}

const payload = {
  buildSha: process.env.REACT_APP_BUILD_SHA || 'local',
  buildRef: process.env.REACT_APP_BUILD_REF || 'local',
  builtAt: new Date().toISOString()
}

fs.writeFileSync(versionFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`[write-version] wrote ${versionFile}`)
