import React from 'react'

export interface IRoute {
  title: string;
  path: string;
  name: string;
  component?: React.FC;
  icon?: string;
  children?: Array<IRoute>
}