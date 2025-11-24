import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Layout, Menu, Dropdown, Avatar, Badge, Space, Button } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useHistory, useLocation } from 'react-router-dom'
import { authorizationHandler } from 'fc-tools-pc/dist/bundle'
import { routes } from '../../router/map'
import { IRoute } from '../../types/router'
import './mainLayout.scss'

const { Header, Sider, Content } = Layout

interface IMainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<IMainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const history = useHistory()
  const location = useLocation()

  // 获取当前选中的菜单项
  const getSelectedKey = (): string => {
    const path = location.pathname
    
    // 递归查找匹配的路由
    const findMatchedRoute = (routes: IRoute[]): string | null => {
      for (const route of routes) {
        // 检查子路由
        if (route.children) {
          for (const child of route.children) {
            const childPath = child.path.split(':')[0].replace(/\/$/, '')
            if (path.startsWith(childPath)) {
              return child.name
            }
          }
        }
        // 检查当前路由
        if (path === route.path || (route.path !== '/' && path.startsWith(route.path))) {
          return route.name
        }
      }
      return null
    }

    return findMatchedRoute(routes) || 'home'
  }

  // 获取页面标题
  const getPageTitle = () => {
    const path = location.pathname
    
    // 递归查找标题
    const findTitle = (routes: IRoute[]): string => {
      for (const route of routes) {
        if (route.children) {
          for (const child of route.children) {
            const childPath = child.path.split(':')[0].replace(/\/$/, '')
            if (path.startsWith(childPath)) {
              return child.title
            }
          }
        }
        if (path === route.path) {
          return route.title
        }
      }
      return '问卷系统'
    }

    return findTitle(routes)
  }

  // 渲染菜单项
  const renderMenuItems = (routes: IRoute[]) => {
    return routes.map(route => {
      if (route.hideInMenu) return null

      // 检查是否有子菜单
      if (route.children && route.children.some(child => !child.hideInMenu)) {
        return (
          <Menu.SubMenu 
            key={route.name} 
            icon={route.icon}
            title={route.title}
          >
            {route.children
              .filter(child => !child.hideInMenu)
              .map(child => (
                <Menu.Item 
                  key={child.name}
                  onClick={() => history.push(child.path)}
                >
                  {child.title}
                </Menu.Item>
              ))}
          </Menu.SubMenu>
        )
      }

      // 一级菜单项
      return (
        <Menu.Item 
          key={route.name} 
          icon={route.icon}
          onClick={() => history.push(route.path)}
        >
          {route.title}
        </Menu.Item>
      )
    })
  }

  // 用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item 
        key="profile" 
        icon={<UserOutlined />}
        onClick={() => history.push('/user/profile')}
      >
        个人资料
      </Menu.Item>
      <Menu.Item 
        key="settings" 
        icon={<SettingOutlined />}
        onClick={() => history.push('/admin/authz')}
      >
        系统设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="logout" 
        icon={<LogoutOutlined />}
        onClick={() => authorizationHandler.logout()}
      >
        退出登录
      </Menu.Item>
    </Menu>
  )

  return (
    <Layout className="main-layout">
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="main-layout-sider"
        width={220}
      >
        <div className="logo">
          <FileTextOutlined className="logo-icon" />
          {!collapsed && <span className="logo-text">问卷系统</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
        >
          {renderMenuItems(routes)}
        </Menu>
      </Sider>

      {/* 主体内容 */}
      <Layout className="site-layout">
        {/* 页头 */}
        <Header className="main-layout-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="trigger-btn"
            />
            <div className="page-title">{getPageTitle()}</div>
          </div>

          <div className="header-right">
            <Space size="large">
              {/* 帮助文档 */}
              <QuestionCircleOutlined 
                className="header-icon" 
                title="帮助文档"
              />

              {/* GitHub */}
              <GithubOutlined 
                className="header-icon"
                title="GitHub"
                onClick={() => window.open('https://github.com/FangcunMountain/qs-operating-system')}
              />

              {/* 通知 */}
              <Badge count={0} showZero={false}>
                <BellOutlined className="header-icon" title="通知" />
              </Badge>

              {/* 用户信息 */}
              <Dropdown overlay={userMenu} placement="bottomRight">
                <div className="user-info">
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined />} 
                    className="user-avatar"
                  />
                  <span className="user-name">管理员</span>
                </div>
              </Dropdown>
            </Space>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content className="main-layout-content">
          <div className="content-wrapper">
            {children}
          </div>
        </Content>

      </Layout>
    </Layout>
  )
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired
}

export default MainLayout
