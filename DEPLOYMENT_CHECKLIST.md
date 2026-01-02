# Pi Network 应用部署检查清单

## 🔍 问题诊断

根据代码分析，发现以下问题已修复：

### ✅ 已修复的问题

1. **前端支付流程错误**
   - ❌ 原问题：使用了错误的 `window.Pi.createPayment()` 和 `showPaymentApproval()` API
   - ✅ 已修复：改用正确的 Pi SDK v2.0 回调函数方式

2. **后端批准接口缺少参数处理**
   - ❌ 原问题：`/api/approve-payment` 必须同时传入 `paymentId` 和 `amount`
   - ✅ 已修复：如果缺少 `amount`，会从缓存或 Pi API 自动获取

3. **缺少完成支付接口**
   - ❌ 原问题：前端调用 `/api/complete-payment` 但后端没有实现
   - ✅ 已修复：已添加完整的 `complete-payment` 接口

4. **Webhook URL 构建错误**
   - ❌ 原问题：在 Vercel 环境中可能无法正确构建完整 URL
   - ✅ 已修复：使用 `x-forwarded-proto` 头来正确构建 URL

---

## 📋 部署前必须检查的配置

### 1. Vercel 环境变量设置 ⚠️ 重要

在 Vercel 项目设置中，必须配置以下环境变量：

```
PI_API_KEY=你的Pi API密钥
PI_APP_PRIV_KEY=你的应用私钥（完整PEM格式或原始格式）
```

**如何获取这些密钥：**
1. 登录 [Pi Network 开发者门户](https://develop.pi.network/)
2. 进入你的应用设置
3. 在 "API Keys" 部分找到：
   - `API Key` → 复制到 `PI_API_KEY`
   - `Application Private Key` → 复制到 `PI_APP_PRIV_KEY`

**私钥格式说明：**
- 如果私钥是完整 PEM 格式（包含 `-----BEGIN EC PRIVATE KEY-----`），直接使用
- 如果是原始格式，代码会自动添加 PEM 头尾

### 2. Pi Network 开发者后台配置 ⚠️ 重要

在 [Pi Network 开发者门户](https://develop.pi.network/) 中配置：

1. **应用域名（App Domain）**
   - 设置为：`https://chinesepi.vercel.app`
   - 或：`https://chinese-cnbg.vercel.app`（根据你实际使用的前端域名）

2. **Webhook URL（回调地址）**
   - 设置为：`https://chinese-cnbg.vercel.app/api/pi-webhook`
   - ⚠️ 这是后端地址，不是前端地址！

3. **应用 Slug**
   - 确认 `APP_SLUG` 在 `backend/server.js` 中正确设置
   - 当前值：`chinese-c03891fab800c044`

### 3. 代码中的配置检查

检查 `backend/server.js` 中的配置：

```javascript
const APP_SLUG = "chinese-c03891fab800c044";  // 确认这是你的应用 Slug
const APP_DOMAIN = "https://chinesepi.vercel.app";  // 确认这是你的前端域名
```

检查 `index.html` 中的后端地址：

```javascript
const API_BASE = "https://chinese-cnbg.vercel.app";  // 确认这是你的后端地址
```

---

## 🚀 部署步骤

### 步骤 1：检查代码

1. ✅ 确认所有代码已提交到 Git 仓库
2. ✅ 确认 `vercel.json` 配置正确
3. ✅ 确认 `backend/package.json` 包含所有依赖

### 步骤 2：在 Vercel 中部署

1. 登录 [Vercel](https://vercel.com/)
2. 导入你的 Git 仓库
3. **重要**：在 "Environment Variables" 中添加：
   - `PI_API_KEY`
   - `PI_APP_PRIV_KEY`
4. 点击 "Deploy"

### 步骤 3：配置 Pi Network 开发者后台

1. 登录 [Pi Network 开发者门户](https://develop.pi.network/)
2. 进入你的应用设置
3. 设置 **App Domain** 为你的前端 Vercel 地址
4. 设置 **Webhook URL** 为你的后端 Vercel 地址 + `/api/pi-webhook`
5. 保存设置

### 步骤 4：测试

1. 在 Pi Browser 中打开你的前端应用
2. 点击 "授权Pi账号" 按钮
3. 输入一个术语（如 "node"）
4. 点击 "支付0.01测试Pi并查询"
5. 在 Pi 钱包中确认支付
6. 检查是否成功显示术语释义

---

## 🔧 常见问题排查

### 问题 1：授权成功但支付失败

**可能原因：**
- 后端环境变量未设置
- Webhook URL 未配置
- 应用域名配置错误

**解决方法：**
1. 检查 Vercel 环境变量是否设置
2. 访问 `https://chinese-cnbg.vercel.app/api/health` 查看后端状态
3. 检查 Pi Network 开发者后台的配置

### 问题 2：支付创建成功但无法批准

**可能原因：**
- 私钥格式错误
- 签名生成失败
- Pi API 调用失败

**解决方法：**
1. 检查 Vercel 日志（在 Vercel Dashboard → Deployments → 点击部署 → Functions → 查看日志）
2. 确认私钥格式正确
3. 检查 Pi API 是否可访问

### 问题 3：Webhook 未收到回调

**可能原因：**
- Webhook URL 配置错误
- Vercel 函数超时
- Pi Network 无法访问你的 Webhook URL

**解决方法：**
1. 确认 Webhook URL 是公开可访问的 HTTPS 地址
2. 检查 Vercel 函数日志
3. 在 Pi Network 开发者后台测试 Webhook

### 问题 4：前端无法连接后端

**可能原因：**
- CORS 配置问题
- 后端地址错误
- Vercel 路由配置错误

**解决方法：**
1. 检查 `index.html` 中的 `API_BASE` 是否正确
2. 检查 `vercel.json` 中的路由配置
3. 在浏览器控制台查看网络请求错误

---

## 📝 调试技巧

### 1. 查看后端日志

在 Vercel Dashboard 中：
1. 进入你的项目
2. 点击 "Deployments"
3. 点击最新的部署
4. 点击 "Functions" 标签
5. 查看 `backend/server.js` 的日志

### 2. 测试后端接口

使用浏览器或 curl 测试：

```bash
# 健康检查
curl https://chinese-cnbg.vercel.app/api/health

# 查看所有支付（调试用）
curl https://chinese-cnbg.vercel.app/api/payments
```

### 3. 前端调试

在 Pi Browser 中：
1. 打开开发者工具（如果可用）
2. 查看 Console 日志
3. 查看 Network 请求

---

## ✅ 最终检查清单

部署前确认：

- [ ] Vercel 环境变量 `PI_API_KEY` 已设置
- [ ] Vercel 环境变量 `PI_APP_PRIV_KEY` 已设置
- [ ] Pi Network 开发者后台的 App Domain 已配置
- [ ] Pi Network 开发者后台的 Webhook URL 已配置
- [ ] `backend/server.js` 中的 `APP_SLUG` 正确
- [ ] `backend/server.js` 中的 `APP_DOMAIN` 正确
- [ ] `index.html` 中的 `API_BASE` 正确
- [ ] 代码已提交并部署到 Vercel
- [ ] 后端健康检查接口可访问
- [ ] 在 Pi Browser 中测试授权功能
- [ ] 在 Pi Browser 中测试支付功能

---

## 📞 需要提供的额外信息

如果问题仍然存在，请提供：

1. **Vercel 部署日志**（特别是错误信息）
2. **浏览器控制台错误**（在 Pi Browser 中打开开发者工具）
3. **后端健康检查响应**（访问 `/api/health` 的返回结果）
4. **Pi Network 开发者后台的配置截图**（隐藏敏感信息）
5. **具体的错误信息**（支付在哪一步失败？）

---

## 🎯 关键修复说明

### 修复 1：前端支付流程

**之前（错误）：**
```javascript
const piPayment = window.Pi.createPayment({...});
const result = await piPayment.showPaymentApproval();
```

**现在（正确）：**
```javascript
const piPayment = await Pi.createPayment(
  { amount, memo, metadata },
  {
    onReadyForServerApproval: async (paymentId) => { ... },
    onReadyForServerCompletion: async (paymentId, txid) => { ... },
    onCancel: () => { ... },
    onError: (error) => { ... }
  }
);
```

### 修复 2：后端批准接口

**之前（错误）：**
- 必须同时传入 `paymentId` 和 `amount`
- 如果前端没传 `amount` 就会失败

**现在（正确）：**
- 如果缺少 `amount`，自动从缓存或 Pi API 获取
- 支持多种调用方式

### 修复 3：完成支付接口

**之前（错误）：**
- 前端调用 `/api/complete-payment` 但后端没有实现

**现在（正确）：**
- 已添加完整的 `complete-payment` 接口
- 正确处理交易 ID 和支付完成逻辑

---

祝部署顺利！🎉

