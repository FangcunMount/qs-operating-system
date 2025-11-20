# 问卷系统管理后台 (QS Operating System)

一个基于 React + TypeScript + Ant Design 的问卷管理系统，支持问卷创建、编辑、答卷管理、数据分析等功能。

## 技术栈

- **框架**: React 17.x
- **语言**: TypeScript 4.3+
- **UI组件库**: Ant Design 4.16+
- **状态管理**: MobX 6.x
- **路由**: React Router DOM 5.x
- **拖拽**: React DnD 14.x
- **构建工具**: Create React App + CRACO
- **样式**: SASS
- **HTTP客户端**: Axios

## 项目依赖环境

### 必需环境

- **Node.js**: 推荐 v14.x 或以上版本
- **npm**: v6.x 或以上版本（或使用 yarn）

### 推荐环境

- **操作系统**: macOS / Linux / Windows
- **编辑器**: VSCode
- **浏览器**: Chrome / Edge / Safari / Firefox 最新版

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd qs-operating-system
```

### 2. 安装依赖

```bash
npm install
# 或使用 yarn
yarn install
```

### 3. 启动开发环境

```bash
npm start
```

项目将自动运行在 `http://localhost:80` 端口。

**注意**: 项目配置的默认端口是 80，如果需要修改端口，请编辑 `package.json` 中的启动脚本：

```json
"scripts": {
  "start": "set PORT=3000 && craco start"  // 修改为你想要的端口
}
```

macOS/Linux 用户需要使用：

```json
"scripts": {
  "start": "PORT=3000 craco start"
}
```

### 4. 开发环境代理配置

项目已配置开发环境代理（`src/setupProxy.js`），将以下请求代理到后端服务：

- `/api/*` → `https://adwenjuan.yangshujie.com`
- `/oss/*` → `https://api.yangshujie.com`

如需修改代理配置，请编辑 `src/setupProxy.js` 文件。

## 项目结构

```text
qs-operating-system/
├── public/                 # 静态资源
├── src/
│   ├── api/               # API 接口定义
│   │   └── path/         # 各模块 API
│   ├── components/        # 公共组件
│   │   ├── layout/       # 布局组件
│   │   │   ├── MainLayout.tsx    # 主布局（带侧边栏和页头）
│   │   │   └── BaseLayout.tsx    # 基础布局（用于编辑页面）
│   │   └── showQuestion/ # 问题展示组件
│   ├── config/           # 配置文件
│   ├── models/           # 数据模型
│   ├── pages/            # 页面组件
│   │   ├── home/        # 首页Dashboard
│   │   ├── as/          # 答卷管理
│   │   ├── qs/          # 问卷管理
│   │   └── user/        # 用户模块
│   ├── router/           # 路由配置
│   ├── store/            # 状态管理
│   ├── tools/            # 工具函数
│   ├── types/            # 类型定义
│   └── utils/            # 工具类
├── craco.config.js       # CRACO 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目依赖
```

## 构建和部署

### 1. 构建生产环境

```bash
npm run build
```

构建完成后，将在项目根目录生成 `build` 文件夹，包含所有优化后的静态资源。

### 2. 部署方式

#### 方式一：静态服务器部署

将 `build` 目录下的所有文件上传到你的静态服务器（如 Nginx、Apache）。

**Nginx 配置示例**:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（可选）
    location /api/ {
        proxy_pass https://adwenjuan.yangshujie.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /oss/ {
        proxy_pass https://api.yangshujie.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 方式二：使用 serve 快速部署

```bash
# 安装 serve
npm install -g serve

# 运行
serve -s build -l 80
```

#### 方式三：Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:14-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建和运行：

```bash
docker build -t qs-operating-system .
docker run -d -p 80:80 qs-operating-system
```

### 3. 环境配置

项目支持多环境配置（`src/config/config.ts`）：

- **local**: 本地开发环境
- **development**: 开发环境
- **production**: 生产环境

根据域名自动切换环境配置，生产环境需要部署到 `adwenjuan.yangshujie.com` 域名。

## 可用脚本

### `npm start`

启动开发服务器（端口 80）

### `npm run build`

构建生产环境代码

### `npm test`

运行测试（交互式监听模式）

### `npm run eject`

弹出 Create React App 配置（不可逆操作，谨慎使用）

## 开发说明

### 代码规范

项目使用 ESLint + TypeScript 进行代码检查，配置了严格的 TypeScript 规则：

- 启用严格模式
- 禁止隐式 any
- 严格空值检查
- 未使用变量检查

### 路径别名

项目配置了 `@` 作为 `src` 目录的别名：

```typescript
import Component from '@/components/Component'
```

### 组件开发

项目使用函数式组件 + Hooks + TypeScript，建议遵循以下规范：

```typescript
import React from 'react'

interface IProps {
  title: string
  onSubmit: () => void
}

const MyComponent: React.FC<IProps> = ({ title, onSubmit }) => {
  return <div>{title}</div>
}

export default MyComponent
```

## 常见问题

### 1. 端口 80 需要管理员权限

macOS/Linux 系统使用 80 端口需要 sudo 权限：

```bash
sudo npm start
```

或修改为其他端口（如 3000）。

### 2. 依赖安装失败

尝试清除缓存后重新安装：

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 3. 代理配置不生效

确保 `src/setupProxy.js` 文件存在且格式正确，重启开发服务器生效。

## License

Private

## 联系方式

如有问题，请联系项目维护者。
