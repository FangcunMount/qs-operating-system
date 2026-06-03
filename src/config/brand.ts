/** public/ 目录下的品牌静态资源（构建后通过根路径访问） */
const publicUrl = process.env.PUBLIC_URL || ''

export const brandAssets = {
  mark: `${publicUrl}/qlume-mark-transparent.png`,
  lockup: `${publicUrl}/qlume-app-icon-dark.png`,
  appIconLight: `${publicUrl}/qlume-app-icon-light.png`,
  appIconDark: `${publicUrl}/qlume-app-icon-dark.png`
} as const

export const brandAlt = 'Qlume'
