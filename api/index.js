const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios'); // 必须安装 axios 用于调用 Pi API
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- 配置区 ---
const PI_API_KEY = process.env.PI_API_KEY;
// 注意：Pi 官方 API 接口地址。沙盒环境通常也是这个，或者 api.sandbox.minepi.com
const PI_API_BASE = "https://api.minepi.com/v2"; 

// 统一的请求头
const getPiHeaders = () => ({
  "Authorization": `Key ${PI_API_KEY}`,
  "Content-Type": "application/json"
});

// 1. 健康检查与配置验证
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!PI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// 2. 核心逻辑：批准支付 (onReadyForServerApproval)
// 前端拿到 paymentId 后，会请求这个接口
app.post('/api/approve', async (req, res) => {
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({ error: "Missing paymentId" });
  }

  try {
    console.log(`[批准] 正在批准支付 ID: ${paymentId}`);
    
    // 告知 Pi 服务器：我的应用批准这笔交易
    const response = await axios.post(
      `${PI_API_BASE}/payments/${paymentId}/approve`,
      {}, 
      { headers: getPiHeaders() }
    );

    console.log(`[批准成功]`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`[批准失败]`, error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Approve failed", details: error.response?.data });
  }
});

// 3. 核心逻辑：完成支付 (onReadyForServerCompletion)
// 用户在钱包签名后，前端会拿到 txid，请求这个接口进行最后结算
app.post('/api/complete', async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ error: "Missing paymentId or txid" });
  }

  try {
    console.log(`[完成] 正在完成支付 ID: ${paymentId}, TXID: ${txid}`);
    
    // 告知 Pi 服务器：交易已在链上签名，请结算
    const response = await axios.post(
      `${PI_API_BASE}/payments/${paymentId}/complete`,
      { txid: txid },
      { headers: getPiHeaders() }
    );

    console.log(`[完成成功]`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`[完成失败]`, error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Complete failed", details: error.response?.data });
  }
});

// 导出给 Vercel 使用
module.exports = app;

// 如果是本地运行
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
