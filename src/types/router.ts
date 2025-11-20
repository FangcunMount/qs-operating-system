import React from 'react'

export interface IRoute {
  title: string;
  path: string;
  name: string;
  component?: React.FC;
  icon?: React.ReactNode;
  exact?: boolean;
  hideInMenu?: boolean;  // 是否在菜单中隐藏
  children?: Array<IRoute>
}