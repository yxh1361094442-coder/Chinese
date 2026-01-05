# Pi Network 支付应用

这是一个基于 Pi Network JavaScript SDK 开发的支付应用，允许用户使用 Pi Network 账户登录并进行支付操作。

## 功能特性

- 用户认证：使用 Pi Network 账户登录
- 支付创建：创建 Pi 支付订单
- 支付流程管理：处理支付的审批和完成
- 响应式设计：适配移动设备和桌面设备

## 环境要求

- 现代 Web 浏览器（支持 JavaScript）
- Pi Network 应用访问权限

## 快速开始

### 1. 配置应用

在 `script.js` 文件中更新您的 Pi Network 应用配置：

```javascript
const PI_CONFIG = {
    appId: 'your-pi-app-id-here', // 替换为您的应用 ID
    version: '1.0',
    sandbox: true // 在开发阶段使用沙盒模式
};
```

### 2. 启动应用

您可以使用任何静态文件服务器来运行此应用。以下是几种常用方法：

#### 方法一：使用 Python

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

然后在浏览器中访问 `http://localhost:8000`

#### 方法二：使用 Node.js (serve)

```bash
# 首先安装 serve
npm install -g serve

# 然后启动服务器
serve .
```

#### 方法三：使用 PHP

```bash
php -S localhost:8000
```

### 3. 使用应用

1. 点击 "使用 Pi Network 登录" 按钮
2. 在 Pi Network 应用中授权登录
3. 登录成功后，填写支付金额和备注
4. 点击 "支付" 按钮创建支付
5. 按照 Pi Network 应用的提示完成支付

## 部署到 Vercel

您可以使用 Vercel 快速部署此应用：

1. 将项目推送到 GitHub 仓库
2. 登录 Vercel 并连接您的 GitHub 账户
3. 选择您的仓库并点击 "Import"
4. 按照提示完成部署

## 文件结构

```
pi-develop/
├── index.html      # 主页面文件
├── style.css       # 样式文件
├── script.js       # 核心 JavaScript 文件
└── README.md       # 项目说明文档
```

## 注意事项

1. **应用 ID**：确保在 `script.js` 中使用您自己的 Pi Network 应用 ID
2. **沙盒模式**：在开发阶段使用 `sandbox: true`，生产环境设置为 `false`
3. **权限范围**：确保您的应用在 Pi Network 开发者门户中请求了必要的权限（`username` 和 `payments`）
4. **后端集成**：在生产环境中，支付的审批和完成应该在后端服务器上进行，而不是在前端直接处理

## 故障排除

### 404 错误
- 检查文件路径是否正确
- 确保所有文件都已正确上传到服务器
- 检查服务器配置，确保静态文件可以正确访问

### 认证失败
- 确保使用了正确的应用 ID
- 检查网络连接
- 确保 Pi Network 应用已安装并登录

### 支付失败
- 确保应用已请求 `payments` 权限
- 检查金额是否大于 0
- 检查网络连接

## 开发说明

此应用使用了以下技术：

- HTML5
- CSS3
- JavaScript (ES6+)
- Pi Network JavaScript SDK

## 许可证

MIT
