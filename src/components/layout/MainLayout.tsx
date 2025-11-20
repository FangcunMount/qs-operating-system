import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Layout, Menu, Dropdown, Avatar, Badge, Space, Button } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  FileTextOutlined,
  FormOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  BarChartOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
  TeamOutlined,
  SafetyOutlined
} from '@ant-design/icons'
import { useHistory, useLocation } from 'react-router-dom'
import { authorizationHandler } from 'fc-tools-pc/dist/bundle'
import './mainLayout.scss'

const { Header, Sider, Content, Footer } = Layout

interface IMainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<IMainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const history = useHistory()
  const location = useLocation()

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/' || path === '/home') return 'home'
    if (path.startsWith('/qs')) return 'qs'
    if (path.startsWith('/as')) return 'as'
    if (path.startsWith('/admin/list')) return 'admin-list'
    if (path.startsWith('/admin/authz')) return 'admin-authz'
    if (path.startsWith('/user/profile')) return 'user'
    return 'home'
  }

  // 获取当前展开的菜单项
  const getOpenKeys = () => {
    const path = location.pathname
    if (path.startsWith('/admin')) return ['admin']
    return []
  }

  // 获取页面标题
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/' || path === '/home') return '首页'
    if (path === '/qs/list') return '问卷列表'
    if (path.includes('/qs/edit')) return '编辑问卷'
    if (path.includes('/qs/factor')) return '设置因子'
    if (path.includes('/qs/analysis')) return '设置解读'
    if (path.includes('/as/list')) return '答卷列表'
    if (path.includes('/as/detail')) return '答卷详情'
    return '问卷系统'
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
          defaultOpenKeys={getOpenKeys()}
        >
          <Menu.Item 
            key="home" 
            icon={<HomeOutlined />}
            onClick={() => history.push('/')}
          >
            首页
          </Menu.Item>
          <Menu.Item 
            key="qs" 
            icon={<FileTextOutlined />}
            onClick={() => history.push('/qs/list')}
          >
            问卷管理
          </Menu.Item>
          <Menu.Item 
            key="as" 
            icon={<FormOutlined />}
            onClick={() => history.push('/qs/list')}
          >
            答卷管理
          </Menu.Item>
          <Menu.Item 
            key="analysis" 
            icon={<BarChartOutlined />}
            onClick={() => history.push('/qs/list')}
          >
            数据分析
          </Menu.Item>
          <Menu.SubMenu 
            key="admin" 
            icon={<SettingOutlined />}
            title="系统管理"
          >
            <Menu.Item 
              key="admin-list" 
              icon={<TeamOutlined />}
              onClick={() => history.push('/admin/list')}
            >
              管理员管理
            </Menu.Item>
            <Menu.Item 
              key="admin-authz" 
              icon={<SafetyOutlined />}
              onClick={() => history.push('/admin/authz')}
            >
              权限配置
            </Menu.Item>
          </Menu.SubMenu>
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

        {/* 页脚 */}
        <Footer className="main-layout-footer">
          <div className="footer-content">
            <div className="copyright">
              Copyright © 2024 问卷系统管理后台
            </div>
            <div className="links">
              <a href="https://github.com/FangcunMountain/qs-operating-system" target="_blank" rel="noopener noreferrer">
                <GithubOutlined /> GitHub
              </a>
            </div>
          </div>
        </Footer>
      </Layout>
    </Layout>
  )
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired
}

export default MainLayout
