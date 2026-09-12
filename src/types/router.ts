import React from 'react'

export type MenuScope = 'public' | 'org_admin' | 'platform_admin' | 'hidden'

export type RouteCapability =
  | 'platform_admin'
  | 'org_admin'
  | 'manage_content'
  | 'read_norm_tables'
  | 'manage_norm_tables'
  | 'manage_evaluation_plans'
  | 'evaluate_assessments'
  | 'audit_interpretation'
  | 'read_subjects'
  | 'read_assessment_records'
  | 'read_operations_statistics'
  | 'read_assessment_progress'

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
  activeMenuName?: string
  children?: Array<IRoute>
}
