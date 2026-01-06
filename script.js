// 全局配置
let isAuthenticated = false;
let currentUser = null;
// 你的后端Vercel域名
const BACKEND_URL = "https://chinese-cnbg.vercel.app";

// 术语库
const termDictionary = {
    "node": { 
        name: "Node", 
        definition: "节点：Pi网络的核心计算单元，负责维护网络安全和共识机制。节点是Pi区块链的基础设施，确保网络的去中心化和安全性。" 
    },
    "testnet": { 
        name: "Testnet", 
        definition: "测试网：Pi的测试环境，用于开发者测试功能和调试支付流程。测试网中的Pi币没有实际价值，仅用于开发测试。" 
    },
    "mainnet": { 
        name: "Mainnet", 
        definition: "主网：Pi的正式运行网络，支持真实Pi币交易。主网是Pi Network的正式生产环境，所有真实的Pi币交易都在主网上进行。" 
    },
    "staking": { 
        name: "Staking", 
        definition: "质押：锁定Pi币以获得额外奖励的机制。用户可以将Pi币锁定一段时间，作为对网络安全的贡献，从而获得额外的Pi币奖励。" 
    },
    "mining": { 
        name: "Mining", 
        definition: "挖矿：参与Pi网络共识以获取Pi币的过程。Pi采用轻量级挖矿机制，用户只需每天点击一次即可参与挖矿，无需消耗大量计算资源。" 
    },
    "balance": { 
        name: "Balance", 
        definition: "余额：用户Pi钱包中可用的Pi币数量。余额包括可转账的Pi币和已锁定的Pi币（用于质押等）。" 
    },
    "security circle": { 
        name: "Security Circle", 
        definition: "安全圈：由用户信任的人组成的网络，用于增强Pi网络的安全性和去中心化。安全圈成员相互验证身份，提高网络整体安全性。" 
    },
    "developer portal": { 
        name: "Developer Portal", 
        definition: "开发者门户：Pi Network为开发者提供的平台，用于注册应用、获取API密钥、管理应用设置和查看应用数据。" 
    },
    "sdk": { 
        name: "SDK", 
        definition: "软件开发工具包：Pi Network提供的开发工具，帮助开发者集成Pi支付功能到自己的应用中。SDK包括前端JavaScript SDK和后端API。" 
    },
    "checklist": { 
        name: "Checklist", 
        definition: "检查清单：Pi Network应用开发过程中需要完成的步骤列表，包括应用注册、API配置、支付集成、测试等。" 
    }
};

// 后端配置状态
let backendConfigOk = false;

// 页面加载完成初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化Pi SDK（必须开启sandbox: true，解决支付超时）
    try {
        Pi.init({ 
            version: "2.0", 
            sandbox: true 
        });
        console.log("✅ Pi SDK 初始化完成");
    } catch (err) {
        console.error("❌ Pi SDK 初始化失败:", err);
        showMessage("Pi SDK 初始化失败，请刷新页面重试", "error");
    }
    
    // 绑定事件
    document.getElementById('authBtn').addEventListener('click', authenticateUser);
    document.getElementById('queryBtn').addEventListener('click', handleQuery);
    document.getElementById('termInput').addEventListener('input', toggleQueryBtn);
    
    // 检查后端连接和配置
    checkBackendConnection();
});

// 检查后端连接和配置
async function checkBackendConnection() {
    try {
        showMessage("正在检查后端连接...");
        const res = await fetch(`${BACKEND_URL}/api/health`);
        const data = await res.json();
        
        if (data.status === 'ok') {
            console.log("✅ 后端连接正常", data);
            backendConfigOk = data.hasConfig;
            
            if (!data.hasConfig) {
                showMessage("⚠️ 警告：后端环境变量未配置完整（PI_API_KEY 或 PI_APP_PRIV_KEY），支付功能将无法使用。请在Vercel项目设置中配置这些环境变量。", "error");
            } else {
                showMessage("✅ 后端配置正常，可以开始使用", "success");
                setTimeout(() => {
                    const el = document.getElementById('paymentInfo');
                    if (el.textContent.includes("后端配置正常")) {
                        el.style.display = "none";
                    }
                }, 3000);
            }
        } else {
            console.warn("⚠️ 后端状态异常:", data);
            showMessage("⚠️ 后端状态异常，支付功能可能无法使用", "error");
        }
    } catch (err) {
        console.error("❌ 无法连接到后端:", err);
        showMessage(`❌ 无法连接到后端服务器：${err.message}。请检查后端是否正常运行。`, "error");
        backendConfigOk = false;
    }
}

// 1. Pi账号授权
async function authenticateUser() {
    try {
        const authBtn = document.getElementById('authBtn');
        authBtn.disabled = true;
        showMessage("正在请求Pi账号授权...");
        
        // 使用正确的Pi SDK授权方法
        const authResult = await Pi.authenticate(['username', 'payments']);
        
        // 授权成功
        isAuthenticated = true;
        currentUser = authResult.user;
        document.getElementById('authStatus').innerHTML = `<p style="margin-top: 10px; color: #2f855a;">✅ 已授权：${currentUser.username}</p>`;
        showMessage("✅ 授权成功！", "success");
        
        // 解锁输入框和查询按钮
        document.getElementById('termInput').disabled = false;
        toggleQueryBtn();
        
        authBtn.textContent = "已授权";
        authBtn.disabled = true;
        
    } catch (error) {
        showMessage(`❌ 授权失败：${error.message}`, "error");
        console.error("授权错误：", error);
        document.getElementById('authBtn').disabled = false;
    }
}

// 2. 处理术语查询+支付
async function handleQuery() {
    const term = document.getElementById('termInput').value.trim().toLowerCase();
    
    // 校验
    if (!term) {
        return showMessage("请输入要查询的术语！", "error");
    }
    
    if (!termDictionary[term]) {
        return showMessage(`未找到术语"${term}"，请检查拼写！支持的术语：node, mining, staking, testnet, mainnet等`, "error");
    }
    
    if (!isAuthenticated) {
        return showMessage("请先授权Pi账号！", "error");
    }

    // 支付前检查后端配置
    if (!backendConfigOk) {
        const confirmRetry = confirm("后端配置可能有问题，是否继续尝试支付？\n\n如果失败，请检查Vercel环境变量配置。");
        if (!confirmRetry) {
            return;
        }
        // 重新检查一次
        await checkBackendConnection();
        if (!backendConfigOk) {
            return showMessage("❌ 后端配置未完成，无法进行支付。请在Vercel中配置 PI_API_KEY 和 PI_APP_PRIV_KEY 环境变量。", "error");
        }
    }

    try {
        const queryBtn = document.getElementById('queryBtn');
        queryBtn.disabled = true;
        showMessage("正在创建支付请求...");
        
        console.log(`[支付] 开始创建支付，术语: ${term}`);
        
        // 创建Pi支付
        const payment = await Pi.createPayment(
            { 
                amount: 0.01, 
                memo: `查询术语：${termDictionary[term].name}`, 
                metadata: { term: term } 
            },
            {
                onReadyForServerApproval: async (paymentId) => {
                    console.log(`[支付] 支付已创建，等待服务器批准: ${paymentId}`);
                    showMessage(`支付已创建（ID: ${paymentId.substring(0, 8)}...），正在批准...`);
                    
                    try {
                        await serverApprovePayment(paymentId, term);
                        console.log(`[支付] 批准成功: ${paymentId}`);
                    } catch (err) {
                        console.error(`[支付] 批准失败:`, err);
                        const errorMsg = err.message || "未知错误";
                        showMessage(`❌ 批准失败：${errorMsg}`, "error");
                        queryBtn.disabled = false;
                        throw err;
                    }
                },
                onReadyForServerCompletion: async (paymentId, txid) => {
                    console.log(`[支付] 支付已完成，等待服务器确认: ${paymentId}, txid: ${txid}`);
                    showMessage("支付已完成，正在确认...");
                    
                    try {
                        await serverCompletePayment(paymentId, txid, term);
                        console.log(`[支付] 确认成功: ${paymentId}`);
                    } catch (err) {
                        console.error(`[支付] 确认失败:`, err);
                        showMessage(`❌ 确认失败：${err.message}`, "error");
                        queryBtn.disabled = false;
                    }
                },
                onCancel: () => {
                    console.log("[支付] 用户取消了支付");
                    showMessage("支付已取消", "error");
                    queryBtn.disabled = false;
                },
                onError: (err) => {
                    console.error("[支付] 支付过程出错:", err);
                    const errorMsg = err.message || err.toString() || "未知错误";
                    showMessage(`❌ 支付错误：${errorMsg}`, "error");
                    queryBtn.disabled = false;
                }
            }
        );
        
        console.log("[支付] 支付对象创建成功:", payment);
        
    } catch (error) {
        console.error("[支付] 支付创建失败:", error);
        const errorMsg = error.message || error.toString() || "未知错误";
        showMessage(`❌ 支付创建失败：${errorMsg}`, "error");
        document.getElementById('queryBtn').disabled = false;
    }
}

// 3. 调用后端审批支付
async function serverApprovePayment(paymentId, term) {
    try {
        showMessage("正在批准支付...");
        console.log(`[前端] 开始批准支付: ${paymentId}`);
        
        // 超时控制（30秒）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const res = await fetch(`${BACKEND_URL}/api/approve-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                paymentId: paymentId,
                amount: 0.01
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await res.json();
        
        if (!res.ok) {
            const errorMsg = data.error || `HTTP ${res.status}: 审批失败`;
            console.error(`[前端] 批准失败:`, {
                status: res.status,
                error: errorMsg,
                details: data
            });
            throw new Error(errorMsg);
        }
        
        console.log("[前端] 支付已批准:", paymentId, data);
        showMessage("✅ 支付已批准，等待完成...");
        
        return data;
        
    } catch (err) {
        console.error("[前端] 审批支付异常:", err);
        if (err.name === 'AbortError') {
            throw new Error("批准请求超时（30秒），请检查网络连接或后端服务");
        }
        throw err;
    }
}

// 4. 调用后端完成支付
async function serverCompletePayment(paymentId, txid, term) {
    try {
        showMessage("正在完成支付...");
        console.log(`[前端] 开始完成支付: ${paymentId}, txid: ${txid}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const res = await fetch(`${BACKEND_URL}/api/complete-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                paymentId: paymentId, 
                txid: txid 
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await res.json();
        
        if (!res.ok) {
            const errorMsg = data.error || `HTTP ${res.status}: 完成支付失败`;
            console.error(`[前端] 完成失败:`, {
                status: res.status,
                error: errorMsg,
                details: data
            });
            throw new Error(errorMsg);
        }
        
        console.log("[前端] 支付完成:", paymentId, data);
        showMessage("🎉 支付成功！", "success");
        
        // 显示术语释义
        displayDefinition(term);
        
        // 重置UI
        document.getElementById('queryBtn').disabled = false;
        
        return data;
        
    } catch (err) {
        console.error("[前端] 完成支付异常:", err);
        if (err.name === 'AbortError') {
            throw new Error("完成请求超时（30秒），请检查网络连接或后端服务");
        }
        throw err;
    }
}

// 显示术语释义
function displayDefinition(term) {
    const info = termDictionary[term];
    document.getElementById('definition').innerHTML = `
        <h3>${info.name}</h3>
        <p>${info.definition}</p>
    `;
    document.getElementById('definitionSection').style.display = "block";
}

// 解锁查询按钮（输入框有内容+已授权）
function toggleQueryBtn() {
    const inputVal = document.getElementById('termInput').value.trim();
    const hasValidTerm = inputVal && termDictionary[inputVal.toLowerCase()];
    document.getElementById('queryBtn').disabled = !(isAuthenticated && hasValidTerm);
}

// 消息提示
function showMessage(text, type = "") {
    const el = document.getElementById('paymentInfo');
    el.textContent = text;
    el.className = `payment-info ${type}`;
    el.style.display = "block";
    
    // 非错误消息3秒后自动隐藏
    if (type !== "error") {
        setTimeout(() => {
            if (el.textContent === text) {
                el.style.display = "none";
            }
        }, 3000);
    }
}
