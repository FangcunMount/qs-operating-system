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
import { routes } from '../../router/map'
import { IRoute } from '../../types/router'
import './mainLayout.scss'

const { Header, Sider, Content } = Layout

interface IMainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<IMainLayoutProps> = ({ children }) => {
  const history = useHistory()
  const location = useLocation()
  
  // 判断是否为编辑量表相关页面
  const isScaleEditPage = () => {
    const path = location.pathname
    return path.startsWith('/scale/info/') ||
           path.startsWith('/scale/create/') ||
           path.startsWith('/scale/routing/') ||
           path.startsWith('/scale/factor/') ||
           path.startsWith('/scale/analysis/') ||
           path.startsWith('/scale/publish/')
  }
  
  // 判断是否为编辑调查问卷相关页面
  const isSurveyEditPage = () => {
    const path = location.pathname
    return path.startsWith('/survey/info/') ||
           path.startsWith('/survey/create/') ||
           path.startsWith('/survey/routing/') ||
           path.startsWith('/survey/publish/') ||
           path.startsWith('/qs/edit/')
  }
  
  // 判断是否为编辑页面（量表或问卷）
  const isEditPageValue = () => isScaleEditPage() || isSurveyEditPage()
  
  // 在编辑页面时自动收起菜单
  const [collapsed, setCollapsed] = useState(() => isEditPageValue())
  
  // 监听路由变化，自动调整菜单状态
  React.useEffect(() => {
    setCollapsed(isEditPageValue())
  }, [location.pathname])

  // 获取当前选中的菜单项
  const getSelectedKey = (): string => {
    const path = location.pathname
    
    // 递归查找匹配的路由
    const findMatchedRoute = (routes: IRoute[]): string | null => {
      for (const route of routes) {
        // 检查子路由（优先匹配子路由，因为子路由更具体）
        if (route.children) {
          // 先按路径长度降序排序，优先匹配更具体的路径
          const sortedChildren = [...route.children].sort((a, b) => {
            const aPath = a.path.split(':')[0].replace(/\/$/, '')
            const bPath = b.path.split(':')[0].replace(/\/$/, '')
            return bPath.length - aPath.length
          })
          
          for (const child of sortedChildren) {
            const childPath = child.path.split(':')[0].replace(/\/$/, '')
            // 使用更精确的匹配：确保路径完全匹配或匹配到路径段边界
            if (path === childPath || path.startsWith(childPath + '/') || (childPath !== '/' && path.startsWith(childPath))) {
              // 如果匹配到的菜单项是隐藏的，返回父菜单下的第一个可见菜单项
              if (child.hideInMenu) {
                const firstVisibleChild = route.children.find(c => !c.hideInMenu)
                return firstVisibleChild ? firstVisibleChild.name : child.name
              }
              return child.name
            }
          }
        }
        // 检查当前路由
        if (path === route.path || (route.path !== '/' && path.startsWith(route.path + '/') || path.startsWith(route.path))) {
          // 如果匹配到的菜单项是隐藏的，尝试返回父菜单下的第一个可见菜单项
          if (route.hideInMenu) {
            // 查找包含此路由的父菜单
            const findParent = (parentRoutes: IRoute[]): string | null => {
              for (const parentRoute of parentRoutes) {
                if (parentRoute.children) {
                  const found = parentRoute.children.find(c => c.name === route.name)
                  if (found) {
                    const firstVisibleChild = parentRoute.children.find(c => !c.hideInMenu)
                    return firstVisibleChild ? firstVisibleChild.name : null
                  }
                  const result = findParent(parentRoute.children)
                  if (result) return result
                }
              }
              return null
            }
            const parentVisible = findParent(routes)
            if (parentVisible) return parentVisible
          }
          return route.name
        }
      }
      return null
    }

    return findMatchedRoute(routes) || 'home'
  }

  // 获取应该展开的父菜单 keys
  const getOpenKeys = (): string[] => {
    const path = location.pathname
    const openKeys: string[] = []
    
    // 遍历路由，找到包含当前路径的父菜单
    const findParentMenu = (routes: IRoute[]) => {
      for (const route of routes) {
        if (route.children) {
          // 检查子路由是否匹配当前路径
          for (const child of route.children) {
            const childPath = child.path.split(':')[0].replace(/\/$/, '')
            if (path.startsWith(childPath)) {
              // 如果找到匹配的子路由，添加父菜单
              if (route.name) {
                openKeys.push(route.name)
              }
              return
            }
          }
          // 递归检查子路由
          findParentMenu(route.children)
        }
      }
    }
    
    findParentMenu(routes)
    return openKeys
  }

  // 管理菜单展开状态
  const [openKeys, setOpenKeys] = useState<string[]>(() => getOpenKeys())
  
  // 监听路由变化，自动更新展开的菜单
  React.useEffect(() => {
    setOpenKeys(getOpenKeys())
  }, [location.pathname])

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

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    history.push('/user/login')
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
        onClick={handleLogout}
      >
        退出登录
      </Menu.Item>
    </Menu>
  )

  // 计算当前是否为编辑页面
  const isEditPage = isScaleEditPage() || isSurveyEditPage()
  
  return (
    <Layout className="main-layout">
      {/* 侧边栏 - 编辑量表页面时完全隐藏 */}
      {!isEditPage && (
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
            openKeys={openKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
          >
            {renderMenuItems(routes)}
          </Menu>
        </Sider>
      )}

      {/* 主体内容 */}
      <Layout className={`site-layout ${isEditPage ? 'full-width' : ''}`}>
        {/* 页头 - 编辑量表页面时隐藏 */}
        {!isEditPage && (
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
        )}

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
