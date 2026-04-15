import React from 'react'

export type MenuScope = 'public' | 'org_admin' | 'platform_admin' | 'clinician' | 'hidden'

export type RouteCapability =
  | 'platform_admin'
  | 'org_admin'
  | 'manage_content'
  | 'manage_evaluation_plans'
  | 'evaluate_assessments'
  | 'read_subjects'
  | 'read_assessment_records'

export interface IRoute {
  title: string;
  path: string;
  name: string;
  component?: React.FC;
  icon?: React.ReactNode;
  exact?: boolean;
  hideInMenu?: boolean;  // 是否在菜单中隐藏
  /** 旧字段，保留兼容；新代码优先使用 requiredRoles/requiredCapabilities */
  roles?: string[]
  menuScope?: MenuScope
  requiredRoles?: string[]
  requiredCapabilities?: RouteCapability[]
  requiresClinician?: boolean
  allowClinicianAccess?: boolean
  hideForClinicianOnly?: boolean
  activeMenuName?: string
  children?: Array<IRoute>
}
