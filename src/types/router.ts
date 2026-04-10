import React from 'react'

export interface IRoute {
  title: string;
  path: string;
  name: string;
  component?: React.FC;
  icon?: React.ReactNode;
  exact?: boolean;
  hideInMenu?: boolean;  // 是否在菜单中隐藏
  /** 可见所需角色（与后端 role name 一致）；不填或空数组表示不限制 */
  roles?: string[]
  children?: Array<IRoute>
}