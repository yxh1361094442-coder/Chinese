// 全局配置
let isAuthenticated = false;
let currentUser = null;

// 🔥 关键修改：Vercel 部署后，API 路径通常是相对路径或 /api/ 路由
// 如果你的前后端部署在同一个 Vercel 项目中，直接用 "/api" 即可，无需完整域名
const API_BASE = "/api"; 

const termDictionary = {
    "node": { name: "Node", definition: "节点：Pi网络的核心计算单元，负责维护网络安全和共识机制。" },
    "testnet": { name: "Testnet", definition: "测试网：Pi的测试环境，用于开发者测试功能和调试支付流程。" },
    "mainnet": { name: "Mainnet", definition: "主网：Pi的正式运行网络，支持真实Pi币交易。" },
    "staking": { name: "Staking", definition: "质押：锁定Pi币以获得额外奖励的机制。" },
    "mining": { name: "Mining", definition: "挖矿：参与Pi网络共识以获取Pi币的过程。" },
    "sdk": { name: "SDK", definition: "软件开发工具包：Pi Network提供的开发工具。" }
};

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Pi SDK
    try {
        window.Pi.init({ version: "2.0", sandbox: true });
        console.log("✅ Pi SDK 初始化完成");
    } catch (err) {
        console.error("❌ Pi SDK 初始化失败:", err);
    }
    
    document.getElementById('authBtn').onclick = authenticateUser;
    document.getElementById('queryBtn').onclick = handleQuery;
    document.getElementById('termInput').oninput = toggleQueryBtn;
});

// 1. Pi 账号授权
async function authenticateUser() {
    try {
        const authBtn = document.getElementById('authBtn');
        authBtn.disabled = true;
        showMessage("正在请求授权...");
        
        // 关键：传入处理未完成支付的回调
        const authResult = await window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound);
        
        isAuthenticated = true;
        currentUser = authResult.user;
        document.getElementById('authStatus').innerHTML = `<p style="color: #2f855a;">✅ 已授权：${currentUser.username}</p>`;
        showMessage("✅ 授权成功！", "success");
        
        document.getElementById('termInput').disabled = false;
        authBtn.textContent = "已授权";
    } catch (error) {
        showMessage(`❌ 授权失败：${error.message}`, "error");
        document.getElementById('authBtn').disabled = false;
    }
}

// 2. 处理支付流程
async function handleQuery() {
    const term = document.getElementById('termInput').value.trim().toLowerCase();
    if (!termDictionary[term]) return showMessage("未找到该术语", "error");

    try {
        const queryBtn = document.getElementById('queryBtn');
        queryBtn.disabled = true;
        showMessage("正在创建支付请求...");

        const payment = await window.Pi.createPayment({
            amount: 0.01,
            memo: `查询术语：${termDictionary[term].name}`,
            metadata: { term: term }
        }, {
            // 步骤 A: 后端批准
            onReadyForServerApproval: async (paymentId) => {
                showMessage("支付已创建，正在批准...");
                return await postToBackend('/approve', { paymentId });
            },
            // 步骤 B: 后端确认完成
            onReadyForServerCompletion: async (paymentId, txid) => {
                showMessage("支付已签名，正在确认...");
                const result = await postToBackend('/complete', { paymentId, txid });
                displayDefinition(term); // 确认成功后显示结果
                return result;
            },
            onCancel: () => {
                showMessage("支付已取消", "error");
                queryBtn.disabled = false;
            },
            onError: (err) => {
                showMessage(`❌ 支付错误: ${err.message}`, "error");
                queryBtn.disabled = false;
            }
        });
    } catch (error) {
        showMessage(`❌ 支付发起失败: ${error.message}`, "error");
        document.getElementById('queryBtn').disabled = false;
    }
}

// 通用的后端请求辅助函数
async function postToBackend(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "服务器处理失败");
    return data;
}

// 处理异常中断的支付
async function onIncompletePaymentFound(payment) {
    console.log("发现未完成支付:", payment);
    if (payment.transaction && payment.transaction.txid) {
        // 如果已经有交易ID，尝试直接完成
        await postToBackend('/complete', { 
            paymentId: payment.identifier, 
            txid: payment.transaction.txid 
        });
        showMessage("✅ 之前的支付已自动修复！", "success");
    }
}

function displayDefinition(term) {
    const info = termDictionary[term];
    document.getElementById('definition').innerHTML = `<h3>${info.name}</h3><p>${info.definition}</p>`;
    document.getElementById('definitionSection').style.display = "block";
    showMessage("🎉 支付成功！", "success");
}

function toggleQueryBtn() {
    const inputVal = document.getElementById('termInput').value.trim();
    document.getElementById('queryBtn').disabled = !(isAuthenticated && inputVal);
}

function showMessage(text, type = "") {
    const el = document.getElementById('paymentInfo');
    el.textContent = text;
    el.className = `payment-info ${type}`;
    el.style.display = "block";
}
