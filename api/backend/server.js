const express = require('express');
const cors = require('cors');
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
const APP_SLUG = "chinese-c03891fab800c044";
const APP_DOMAIN = "https://chinesepi.vercel.app";

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    environment: "sandbox",
    hasConfig: !!PI_API_KEY && !!PI_APP_PRIV_KEY,
    appSlug: APP_SLUG,
    domain: APP_DOMAIN
  });
});

// 1. 创建支付订单（前端调用）
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, memo, userUid, metadata } = req.body;
    
    if (!amount || !memo || !userUid) {
      return res.status(400).json({ 
        success: false, 
        error: "缺少必要参数" 
      });
    }

    console.log(`[创建支付] 用户:${userUid}, 金额:${amount}, 备注:${memo}`);

    // 调用Pi API创建支付
    const paymentRes = await fetch(`${PI_API_BASE}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        "X-App-Slug": APP_SLUG,
        "X-App-Domain": APP_DOMAIN
      },
      body: JSON.stringify({
        payment: {
          amount: parseFloat(amount),
          memo: memo,
          metadata: metadata || {},
          uid: userUid,
          sandbox: true
        }
      })
    });

    const paymentData = await paymentRes.json();
    
    if (!paymentRes.ok) {
      console.error(`Pi API错误: ${JSON.stringify(paymentData)}`);
      throw new Error(`支付创建失败: ${paymentData.error || paymentRes.status}`);
    }

    const paymentId = paymentData.payment_identifier;
    console.log(`[创建成功] 支付ID: ${paymentId}`);

    // 缓存支付信息
    paymentsCache[paymentId] = {
      identifier: paymentId,
      amount: paymentData.amount,
      memo: paymentData.memo,
      metadata: metadata,
      userUid: userUid,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    // 返回给前端
    res.json({
      success: true,
      payment: {
        identifier: paymentId,
        amount: paymentData.amount,
        memo: paymentData.memo,
        status: paymentData.status,
        user_uid: userUid,
        userUid: userUid
      }
    });
    
  } catch (err) {
    console.error("[创建支付失败]", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 2. 批准支付（前端或Webhook调用）
app.post('/api/approve-payment', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        error: "缺少paymentId" 
      });
    }

    console.log(`[批准支付] 开始处理: ${paymentId}`);

    // 如果前端没有传 amount，从缓存中获取
    let paymentAmount = amount;
    if (!paymentAmount && paymentsCache[paymentId]) {
      paymentAmount = paymentsCache[paymentId].amount;
    }
    
    // 如果还是没有，从 Pi API 获取
    if (!paymentAmount) {
      try {
        const statusRes = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
          headers: { 
            "Authorization": `Key ${PI_API_KEY}`,
            "X-App-Slug": APP_SLUG
          }
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          paymentAmount = statusData.amount;
        }
      } catch (err) {
        console.error("获取支付信息失败:", err);
      }
    }
    
    if (!paymentAmount) {
      return res.status(400).json({ 
        success: false, 
        error: "无法获取支付金额" 
      });
    }

    // 生成签名（ECDSA SHA256）
    const crypto = require('crypto');
    const signStr = `${paymentId}_${paymentAmount}`;
    const sign = crypto.createSign('sha256');
    sign.update(signStr);
    sign.end();
    
    // 处理私钥格式
    let privateKey = PI_APP_PRIV_KEY;
    if (!privateKey) {
      throw new Error("PI_APP_PRIV_KEY 环境变量未设置");
    }
    
    // 如果私钥不包含 PEM 头，尝试添加（Pi Network 通常提供原始格式）
    if (!privateKey.includes('-----BEGIN')) {
      // 尝试添加 PEM 头尾（EC 私钥格式）
      // 注意：如果这不起作用，可能需要使用原始格式
      try {
        privateKey = `-----BEGIN EC PRIVATE KEY-----\n${privateKey.replace(/\s/g, '')}\n-----END EC PRIVATE KEY-----`;
      } catch (e) {
        // 如果格式化失败，使用原始私钥
        console.warn("私钥格式化警告，使用原始格式");
      }
    }
    
    let signature;
    try {
      signature = sign.sign(privateKey, 'base64');
    } catch (signErr) {
      // 如果 PEM 格式失败，尝试使用原始格式
      console.warn("PEM 格式签名失败，尝试原始格式:", signErr.message);
      try {
        const sign2 = crypto.createSign('sha256');
        sign2.update(signStr);
        sign2.end();
        // 直接使用原始私钥（可能是 base64 编码的）
        signature = sign2.sign(Buffer.from(PI_APP_PRIV_KEY.replace(/\s/g, ''), 'base64'), 'base64');
      } catch (signErr2) {
        throw new Error(`签名生成失败: ${signErr2.message}`);
      }
    }
    
    if (!signature) {
      throw new Error("签名生成失败");
    }

    // 调用Pi API批准支付
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
      console.error(`批准失败: ${JSON.stringify(approveData)}`);
      throw new Error(`支付批准失败: ${approveData.error || approveRes.status}`);
    }

    console.log(`[批准成功] ${paymentId}`);
    
    // 更新缓存状态
    if (paymentsCache[paymentId]) {
      paymentsCache[paymentId].status = 'approved';
      paymentsCache[paymentId].approvedAt = new Date().toISOString();
      paymentsCache[paymentId].amount = paymentAmount;
    }

    res.json({ 
      success: true, 
      message: "支付已批准",
      paymentId: paymentId,
      signature: signature
    });
    
  } catch (err) {
    console.error("[批准支付失败]", err);
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
    
    console.log(`[Webhook收到] 事件: ${event}, 支付ID: ${paymentId}`);

    // 立即响应Pi，避免超时
    res.status(200).json({ 
      received: true,
      event: event,
      paymentId: paymentId 
    });

    // 异步处理事件
    setTimeout(async () => {
      try {
        // 处理payment_created事件 - 自动批准支付
        if (event === "payment.created") {
          console.log(`[自动批准] 触发: ${paymentId}`);
          
          // 调用批准接口（使用完整URL）
          const webhookUrl = req.headers['x-forwarded-proto'] 
            ? `${req.headers['x-forwarded-proto']}://${req.headers.host}`
            : `https://${req.headers.host}`;
          
          const approveRes = await fetch(`${webhookUrl}/api/approve-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: paymentId,
              amount: payment.amount
            })
          });
          
          const approveData = await approveRes.json();
          console.log(`[批准结果] ${paymentId}: ${approveData.success ? '成功' : '失败'}`);
        }
        
        // 更新缓存状态
        if (paymentsCache[paymentId]) {
          paymentsCache[paymentId].status = payment.status || event;
          paymentsCache[paymentId].lastEvent = event;
          paymentsCache[paymentId].updatedAt = new Date().toISOString();
          
          if (event === "payment.completed") {
            console.log(`🎉 [支付完成] ${paymentId}`);
            // 这里可以执行你的业务逻辑
            const cached = paymentsCache[paymentId];
            if (cached.metadata && cached.metadata.queryTerm) {
              console.log(`用户查询术语: ${cached.metadata.queryTerm}`);
            }
          }
        }
        
      } catch (asyncErr) {
        console.error("[Webhook异步处理失败]", asyncErr);
      }
    }, 100); // 延迟100ms处理，确保先响应Pi
    
  } catch (err) {
    console.error("[Webhook处理失败]", err);
    // 即使出错也要返回200
    res.status(200).json({ 
      received: true, 
      error: err.message 
    });
  }
});

// 3.5. 完成支付（前端调用）
app.post('/api/complete-payment', async (req, res) => {
  try {
    const { paymentId, txid } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ 
        success: false, 
        error: "缺少paymentId或txid" 
      });
    }

    console.log(`[完成支付] 支付ID: ${paymentId}, 交易ID: ${txid}`);

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
      console.error(`完成失败: ${JSON.stringify(completeData)}`);
      throw new Error(`支付完成失败: ${completeData.error || completeRes.status}`);
    }

    console.log(`[完成成功] ${paymentId}`);
    
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
    console.error("[完成支付失败]", err);
    res.status(500).json({ 
      success: false, 
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
🔑 API Key: ${PI_API_KEY ? '已设置' : '未设置'}
🔐 私钥: ${PI_APP_PRIV_KEY ? '已设置' : '未设置'}
🌐 域名: ${APP_DOMAIN}
  `);
});

module.exports = app;
