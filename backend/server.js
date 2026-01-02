const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

// 配置跨域（允许前端访问）
app.use(cors());
// 解析JSON请求体
app.use(express.json());

// ********** 替换为你的Pi应用API密钥 **********
// 从Pi开发者门户（develop.pi）获取
const PI_API_KEY = "你的应用API密钥";
const PI_API_BASE_URL = "https://api.minepi.com/v2";


// 接口1：审批支付（对应官方/approve接口）
app.post('/api/approve-payment', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: "缺少paymentId" });
    }

    // 调用Pi官方API审批支付
    const piResponse = await fetch(`${PI_API_BASE_URL}/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ approved: true })
    });

    const piData = await piResponse.json();
    if (!piResponse.ok) {
      throw new Error(piData.error || "Pi API审批失败");
    }

    res.json({ success: true, data: piData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 接口2：完成支付（对应官方/complete接口）
app.post('/api/complete-payment', async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) {
      return res.status(400).json({ error: "缺少paymentId或txid" });
    }

    // 调用Pi官方API完成支付
    const piResponse = await fetch(`${PI_API_BASE_URL}/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txid: txid })
    });

    const piData = await piResponse.json();
    if (!piResponse.ok) {
      throw new Error(piData.error || "Pi API完成支付失败");
    }

    res.json({ success: true, data: piData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`后端服务运行在端口 ${PORT}`);
});
