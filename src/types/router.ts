import React from 'react'

export interface IRoute {
  title: string;
  path: string;
  name: string;
  component?: React.FC;
  icon?: string;
  exact?: boolean;
  children?: Array<IRoute>
}