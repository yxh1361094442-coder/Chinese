const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

// 跨域与解析配置
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// 支付状态缓存（生产环境请用数据库）
const paymentsCache = {};

// Pi API配置
const PI_API_KEY = process.env.PI_API_KEY;
const PI_APP_PRIV_KEY = process.env.PI_APP_PRIV_KEY;
const PI_API_BASE = "https://api.sandbox.minepi.com/v2";
const APP_SLUG = process.env.PI_APP_SLUG || "chinese-c03891fab800c044";
const APP_DOMAIN = process.env.PI_APP_DOMAIN || "https://chinesepi.vercel.app";

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    environment: "sandbox",
    hasConfig: !!PI_API_KEY && !!PI_APP_PRIV_KEY,
    appSlug: APP_SLUG,
    domain: APP_DOMAIN,
    timestamp: new Date().toISOString()
  });
});

// 生成支付签名（修复：改进签名生成逻辑）
function generatePaymentSignature(paymentId, amount) {
  if (!PI_APP_PRIV_KEY) {
    throw new Error("PI_APP_PRIV_KEY 环境变量未设置");
  }

  const signStr = `${paymentId}_${amount}`;
  console.log(`[签名] 签名字符串: ${signStr}`);
  
  const sign = crypto.createSign('sha256');
  sign.update(signStr);
  sign.end();

  let privateKey = PI_APP_PRIV_KEY.trim();
  
  // 处理私钥格式
  if (!privateKey.includes('-----BEGIN')) {
    // 如果私钥不包含PEM头，尝试添加
    // Pi Network通常提供的是base64编码的原始私钥
    const keyWithoutSpaces = privateKey.replace(/\s/g, '');
    privateKey = `-----BEGIN EC PRIVATE KEY-----\n${keyWithoutSpaces}\n-----END EC PRIVATE KEY-----`;
  }

  try {
    const signature = sign.sign(privateKey, 'base64');
    console.log(`[签名] 签名生成成功 (PEM格式)`);
    return signature;
  } catch (signErr) {
    // 如果PEM格式失败，尝试原始格式
    console.warn(`[签名] PEM格式失败: ${signErr.message}，尝试原始格式`);
    try {
      const sign2 = crypto.createSign('sha256');
      sign2.update(signStr);
      sign2.end();
      // 尝试直接使用base64解码的私钥
      const keyWithoutSpaces = PI_APP_PRIV_KEY.replace(/\s/g, '');
      const rawKey = Buffer.from(keyWithoutSpaces, 'base64');
      const signature = sign2.sign(rawKey, 'base64');
      console.log(`[签名] 签名生成成功 (原始格式)`);
      return signature;
    } catch (signErr2) {
      console.error(`[签名] 原始格式也失败: ${signErr2.message}`);
      throw new Error(`签名生成失败: ${signErr2.message}`);
    }
  }
}

// 1. 批准支付（前端调用）- 修复：添加更详细的日志和错误处理
app.post('/api/approve-payment', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    
    console.log(`[后端] 收到批准请求:`, { paymentId, amount });
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        error: "缺少paymentId" 
      });
    }

    // 检查环境变量
    if (!PI_API_KEY) {
      console.error("[后端] PI_API_KEY 未设置");
      return res.status(500).json({
        success: false,
        error: "服务器配置错误：PI_API_KEY 未设置"
      });
    }

    if (!PI_APP_PRIV_KEY) {
      console.error("[后端] PI_APP_PRIV_KEY 未设置");
      return res.status(500).json({
        success: false,
        error: "服务器配置错误：PI_APP_PRIV_KEY 未设置"
      });
    }

    // 获取支付金额
    let paymentAmount = amount;
    if (!paymentAmount && paymentsCache[paymentId]) {
      paymentAmount = paymentsCache[paymentId].amount;
    }
    
    // 如果还是没有，从 Pi API 获取
    if (!paymentAmount) {
      try {
        console.log(`[后端] 从Pi API获取支付信息: ${paymentId}`);
        const statusRes = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
          headers: { 
            "Authorization": `Key ${PI_API_KEY}`,
            "X-App-Slug": APP_SLUG
          }
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          paymentAmount = statusData.amount;
          console.log(`[后端] 从Pi API获取到金额: ${paymentAmount}`);
        } else {
          const errorData = await statusRes.json();
          console.error(`[后端] 获取支付信息失败:`, errorData);
        }
      } catch (err) {
        console.error("[后端] 获取支付信息异常:", err);
      }
    }
    
    if (!paymentAmount) {
      return res.status(400).json({ 
        success: false, 
        error: "无法获取支付金额，请确保paymentId正确" 
      });
    }

    // 生成签名
    let signature;
    try {
      signature = generatePaymentSignature(paymentId, paymentAmount);
    } catch (signErr) {
      console.error(`[后端] 签名生成失败:`, signErr);
      return res.status(500).json({
        success: false,
        error: `签名生成失败: ${signErr.message}`
      });
    }

    // 调用Pi API批准支付
    console.log(`[后端] 调用Pi API批准支付: ${paymentId}`);
    const approveRes = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        "X-App-Slug": APP_SLUG,
        "X-App-Domain": APP_DOMAIN
      },
      body: JSON.stringify({
        payment: {
          approved: true,
          sandbox: true,
          signature: signature
        }
      })
    });

    const approveData = await approveRes.json();
    
    if (!approveRes.ok) {
      console.error(`[后端] Pi API批准失败:`, {
        status: approveRes.status,
        statusText: approveRes.statusText,
        data: approveData
      });
      return res.status(approveRes.status).json({
        success: false,
        error: `支付批准失败: ${approveData.error || approveData.message || approveRes.statusText || '未知错误'}`,
        details: approveData
      });
    }

    console.log(`[后端] 批准成功: ${paymentId}`);
    
    // 更新缓存状态
    paymentsCache[paymentId] = {
      identifier: paymentId,
      amount: paymentAmount,
      status: 'approved',
      approvedAt: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      message: "支付已批准",
      paymentId: paymentId
    });
    
  } catch (err) {
    console.error("[后端] 批准支付异常:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "服务器内部错误"
    });
  }
});

// 2. 完成支付（前端调用）
app.post('/api/complete-payment', async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ 
        success: false, 
        error: "缺少paymentId或txid" 
      });
    }

    console.log(`[后端] 完成支付: ${paymentId}, txid: ${txid}`);

    // 调用Pi API完成支付
    const completeRes = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        "X-App-Slug": APP_SLUG,
        "X-App-Domain": APP_DOMAIN
      },
      body: JSON.stringify({
        payment: {
          txid: txid,
          sandbox: true
        }
      })
    });

    const completeData = await completeRes.json();
    
    if (!completeRes.ok) {
      console.error(`[后端] 完成失败:`, completeData);
      throw new Error(`支付完成失败: ${completeData.error || completeRes.status}`);
    }

    console.log(`[后端] 完成成功: ${paymentId}`);
    
    // 更新缓存状态
    if (paymentsCache[paymentId]) {
      paymentsCache[paymentId].status = 'completed';
      paymentsCache[paymentId].txid = txid;
      paymentsCache[paymentId].completedAt = new Date().toISOString();
    }

    res.json({ 
      success: true, 
      message: "支付已完成",
      paymentId: paymentId,
      txid: txid
    });
    
  } catch (err) {
    console.error("[后端] 完成支付异常:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 3. Pi Webhook回调
app.post('/api/pi-webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    const payment = data;
    const paymentId = payment.payment_identifier || payment.identifier;
    
    console.log(`[Webhook] 收到事件: ${event}, 支付ID: ${paymentId}`);

    // 立即响应Pi，避免超时
    res.status(200).json({ 
      received: true,
      event: event,
      paymentId: paymentId 
    });

    // 异步处理事件
    setTimeout(async () => {
      try {
        // 更新缓存状态
        if (paymentsCache[paymentId]) {
          paymentsCache[paymentId].status = payment.status || event;
          paymentsCache[paymentId].lastEvent = event;
          paymentsCache[paymentId].updatedAt = new Date().toISOString();
          
          if (event === "payment.completed") {
            console.log(`🎉 [Webhook] 支付完成: ${paymentId}`);
            const cached = paymentsCache[paymentId];
            if (cached.metadata && cached.metadata.term) {
              console.log(`用户查询术语: ${cached.metadata.term}`);
            }
          }
        }
      } catch (asyncErr) {
        console.error("[Webhook] 异步处理失败:", asyncErr);
      }
    }, 100);
    
  } catch (err) {
    console.error("[Webhook] 处理失败:", err);
    res.status(200).json({ 
      received: true, 
      error: err.message 
    });
  }
});

// 4. 查询支付状态
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // 从缓存获取
    if (paymentsCache[paymentId]) {
      return res.json({ 
        success: true, 
        data: paymentsCache[paymentId] 
      });
    }

    // 从Pi API获取
    const statusRes = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
      headers: { 
        "Authorization": `Key ${PI_API_KEY}`,
        "X-App-Slug": APP_SLUG
      }
    });
    
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      res.json({ success: true, data: statusData });
    } else {
      res.json({ 
        success: true, 
        data: { 
          identifier: paymentId,
          status: 'unknown',
          message: '支付信息未找到'
        }
      });
    }
    
  } catch (err) {
    console.error("[查询支付失败]", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 5. 调试接口：查看所有支付
app.get('/api/payments', (req, res) => {
  res.json({
    success: true,
    count: Object.keys(paymentsCache).length,
    payments: paymentsCache
  });
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
✅ Pi支付后端启动成功
📡 端口: ${PORT}
🔑 API Key: ${PI_API_KEY ? '已设置' : '❌ 未设置'}
🔐 私钥: ${PI_APP_PRIV_KEY ? '已设置' : '❌ 未设置'}
🌐 域名: ${APP_DOMAIN}
🔧 环境: sandbox
  `);
});

module.exports = app;
