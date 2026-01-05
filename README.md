# Chinese - Pi术语查询应用

一个基于Pi Network的Web应用，用户支付0.01 Pi币后可以查询Pi生态英文术语的中文释义。

## 项目结构

```
pi-develop/
├── index.html      # 主页面文件（包含Pi SDK引入）
├── style.css       # 样式文件（响应式设计）
├── script.js       # JavaScript功能文件（核心逻辑）
└── README.md       # 项目说明文档
```

## 功能特性

- ✅ 纯前端实现，无需后端和数据库
- ✅ 集成Pi Network Frontend JavaScript SDK
- ✅ 用户Pi账号授权（仅获取用户名）
- ✅ 0.01 Pi币支付查询
- ✅ 内置10个高频Pi术语查询
- ✅ 响应式设计，适配手机和电脑端
- ✅ 完整的错误处理和用户反馈

## 支持查询的术语

- Node (节点)
- Testnet (测试网)
- Mainnet (主网)
- Staking (质押)
- Mining (挖矿)
- Balance (余额)
- Security Circle (安全圈)
- Developer Portal (开发者门户)
- SDK (软件开发工具包)
- Checklist (检查清单)

## 部署指南

### 方法1：GitHub Pages部署（推荐）

1. **创建GitHub仓库**
   - 登录GitHub，创建一个新的公共仓库
   - 仓库名称建议使用：`pi-chinese-term-query` 或其他您喜欢的名称

2. **上传文件**
   - 将 `index.html`、`style.css`、`script.js` 三个文件上传到仓库根目录

3. **启用GitHub Pages**
   - 进入仓库设置 → Pages
   - 选择 "main" 分支，根目录
   - 点击 "Save" 保存设置
   - 等待几分钟，GitHub会生成访问URL（通常是 `https://your-username.github.io/repository-name/`）

### 方法2：其他静态网站托管

您也可以使用以下平台部署：
- Vercel
- Netlify
- Cloudflare Pages
- 自己的Web服务器

## Pi Browser验证说明

1. **在Pi Network应用中打开**
   - 打开Pi Network移动应用
   - 进入主界面，点击左上角菜单
   - 选择 "Pi Browser"

2. **访问部署后的URL**
   - 在Pi Browser的地址栏中输入您的应用URL
   - 点击 "Go" 访问

3. **功能验证**
   - 点击 "点击授权Pi账号" 按钮
   - 在弹出的授权窗口中确认授权
   - 输入一个支持的术语（如 "Node"）
   - 点击 "查询术语" 按钮
   - 在Pi钱包中确认支付0.01 Pi币
   - 支付成功后，查看中文释义

## 使用说明

1. **授权账号**
   - 首次使用需要授权Pi账号
   - 仅获取用户名信息，保护隐私安全

2. **输入术语**
   - 在输入框中输入Pi英文术语
   - 支持的术语请参考上方列表
   - 不区分大小写

3. **发起查询**
   - 点击"查询术语"按钮
   - 系统会创建0.01 Pi币的支付请求

4. **完成支付**
   - 在Pi钱包中确认支付
   - 支付成功后自动显示中文释义

## 开发说明

### 核心代码位置

1. **术语库**：在 `script.js` 文件的 `termDictionary` 对象中
   ```javascript
   const termDictionary = {
       "node": {
           name: "Node",
           definition: "节点：Pi网络中的计算机或服务器..."
       },
       // 其他术语...
   };
   ```

2. **支付接口调用**：在 `script.js` 文件的 `createPayment` 函数中
   ```javascript
   const payment = await Pi.createPayment({
       amount: 0.01, // 支付金额
       memo: `查询术语: ${termDictionary[term].name}`, // 备注
       metadata: { term: term } // 元数据
   });
   ```

### 生产环境配置

当前应用使用测试环境（sandbox: true），如果需要切换到生产环境：

1. 在 `script.js` 文件中找到：
   ```javascript
   Pi.init({
       version: "2.0",
       sandbox: true // 测试环境
   });
   ```

2. 修改为：
   ```javascript
   Pi.init({
       version: "2.0",
       sandbox: false // 生产环境
   });
   ```

3. 在 [Pi Network开发者门户](https://develop.pi.network/) 注册您的应用并获取应用ID

## 注意事项

1. **浏览器兼容性**
   - 最佳体验：Pi Network浏览器
   - 普通浏览器：可以查看界面，但无法使用Pi相关功能

2. **支付说明**
   - 当前为测试环境，支付不会扣除真实Pi币
   - 生产环境会真实扣除0.01 Pi币

3. **术语更新**
   - 可以在 `script.js` 文件的 `termDictionary` 中添加或修改术语

## 技术支持

如果遇到问题：
1. 确保使用Pi Network浏览器访问
2. 检查网络连接
3. 确认已完成Pi账号授权
4. 检查输入的术语拼写是否正确

## 许可证

本项目采用 MIT 许可证

---

祝您使用愉快！🎉
