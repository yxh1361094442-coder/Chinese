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

// 页面加载完成初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化Pi SDK（必须开启sandbox: true，解决支付超时）
    Pi.init({ 
        version: "2.0", 
        sandbox: true 
    });
    
    console.log("Pi SDK 初始化完成");
    
    // 绑定事件
    document.getElementById('authBtn').addEventListener('click', authenticateUser);
    document.getElementById('queryBtn').addEventListener('click', handleQuery);
    document.getElementById('termInput').addEventListener('input', toggleQueryBtn);
    
    // 检查后端连接
    checkBackendConnection();
});

// 检查后端连接
async function checkBackendConnection() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        const data = await res.json();
        if (data.status === 'ok') {
            console.log("后端连接正常", data);
            if (!data.hasConfig) {
                showMessage("警告：后端环境变量未配置完整，支付功能可能无法使用", "error");
            }
        } else {
            console.warn("后端状态异常");
        }
    } catch (err) {
        console.error("无法连接到后端:", err);
        showMessage("警告：无法连接到后端服务器，支付功能可能无法使用", "error");
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
        showMessage("授权成功！", "success");
        
        // 解锁输入框和查询按钮
        document.getElementById('termInput').disabled = false;
        toggleQueryBtn();
        
        authBtn.textContent = "已授权";
        authBtn.disabled = true;
        
    } catch (error) {
        showMessage(`授权失败：${error.message}`, "error");
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
        return showMessage(`未找到术语"${term}"，请检查拼写！`, "error");
    }
    
    if (!isAuthenticated) {
        return showMessage("请先授权Pi账号！", "error");
    }

    try {
        const queryBtn = document.getElementById('queryBtn');
        queryBtn.disabled = true;
        showMessage("正在创建支付请求...");
        
        // 创建Pi支付（直接使用Pi SDK，不需要先调用后端）
        const payment = await Pi.createPayment(
            { 
                amount: 0.01, 
                memo: `查询术语：${termDictionary[term].name}`, 
                metadata: { term: term } 
            },
            {
                // 🔥 关键修复：必须返回 Promise，确保异步操作完成
                onReadyForServerApproval: async (paymentId) => {
                    console.log("支付已创建，等待服务器批准:", paymentId);
                    try {
                        await serverApprovePayment(paymentId, term);
                    } catch (err) {
                        console.error("批准支付失败:", err);
                        showMessage(`批准失败：${err.message}`, "error");
                        queryBtn.disabled = false;
                        throw err; // 重新抛出错误，让Pi SDK知道批准失败
                    }
                },
                onReadyForServerCompletion: async (paymentId, txid) => {
                    console.log("支付已完成，等待服务器确认:", paymentId, txid);
                    try {
                        await serverCompletePayment(paymentId, txid, term);
                    } catch (err) {
                        console.error("完成支付失败:", err);
                        showMessage(`完成失败：${err.message}`, "error");
                        queryBtn.disabled = false;
                    }
                },
                onCancel: () => {
                    console.log("支付已取消");
                    showMessage("支付已取消", "error");
                    queryBtn.disabled = false;
                },
                onError: (err) => {
                    console.error("支付错误:", err);
                    showMessage(`支付错误：${err.message || err}`, "error");
                    queryBtn.disabled = false;
                }
            }
        );
        
        console.log("支付对象创建成功:", payment);
        
    } catch (error) {
        console.error("支付创建失败:", error);
        showMessage(`支付创建失败：${error.message || error}`, "error");
        document.getElementById('queryBtn').disabled = false;
    }
}

// 3. 调用后端审批支付（修复：确保正确处理错误和超时）
async function serverApprovePayment(paymentId, term) {
    try {
        showMessage("正在批准支付...");
        console.log(`[前端] 开始批准支付: ${paymentId}`);
        
        const res = await fetch(`${BACKEND_URL}/api/approve-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                paymentId: paymentId,
                amount: 0.01
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            const errorMsg = data.error || `HTTP ${res.status}: 审批失败`;
            console.error(`[前端] 批准失败:`, errorMsg, data);
            throw new Error(errorMsg);
        }
        
        console.log("[前端] 支付已批准:", paymentId, data);
        showMessage("支付已批准，等待完成...");
        
        return data; // 返回结果，确保Promise正确解析
        
    } catch (err) {
        console.error("[前端] 审批支付异常:", err);
        throw err; // 重新抛出，让调用者处理
    }
}

// 4. 调用后端完成支付
async function serverCompletePayment(paymentId, txid, term) {
    try {
        showMessage("正在完成支付...");
        console.log(`[前端] 开始完成支付: ${paymentId}, txid: ${txid}`);
        
        const res = await fetch(`${BACKEND_URL}/api/complete-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                paymentId: paymentId, 
                txid: txid 
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            const errorMsg = data.error || `HTTP ${res.status}: 完成支付失败`;
            console.error(`[前端] 完成失败:`, errorMsg, data);
            throw new Error(errorMsg);
        }
        
        console.log("[前端] 支付完成:", paymentId, data);
        showMessage("支付成功！", "success");
        
        // 显示术语释义
        displayDefinition(term);
        
        // 重置UI
        document.getElementById('queryBtn').disabled = false;
        
        return data;
        
    } catch (err) {
        console.error("[前端] 完成支付异常:", err);
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
