// 全局状态
let isAuthenticated = false;
let currentUser = null;
let appAPIKey = "你的应用API密钥"; // 替换为开发者门户获取的API Key

// 术语库（官方示例格式）
const termDictionary = {
    "node": { name: "Node", definition: "节点：Pi网络的核心计算单元，负责维护网络安全。" },
    "testnet": { name: "Testnet", definition: "测试网：Pi的测试环境，不涉及真实Pi币。" },
    "mainnet": { name: "Mainnet", definition: "主网：Pi的正式运行网络，支持真实Pi币交易。" },
    "staking": { name: "Staking", definition: "质押：锁定Pi币以获得额外奖励的机制。" },
    "mining": { name: "Mining", definition: "挖矿：参与Pi网络共识以获取Pi币的过程。" }
};

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('authBtn').addEventListener('click', authenticateUser);
    document.getElementById('queryBtn').addEventListener('click', handleQuery);
    document.getElementById('termInput').addEventListener('input', toggleQueryBtn);
});

// 1. 官方规范：用户身份验证（必须请求payments权限）
async function authenticateUser() {
    try {
        showMessage("正在请求授权...");
        // 官方要求：请求username和payments权限（支付必须）
        const authResult = await Pi.authenticate(["username", "payments"], handleIncompletePayment);
        
        // 授权成功
        isAuthenticated = true;
        currentUser = authResult.user;
        document.getElementById('authStatus').innerHTML = `<p>已授权用户：${currentUser.username}</p>`;
        document.getElementById('termInput').disabled = false;
        showMessage("授权成功！", "success");
        toggleQueryBtn();
    } catch (error) {
        showMessage(`授权失败：${error.message}`, "error");
    }
}

// 处理未完成的支付（官方要求的回调）
function handleIncompletePayment(payment) {
    showMessage(`检测到未完成支付：${payment.identifier}`, "error");
    // 可选：引导用户完成未支付的订单
}

// 2. 处理术语查询
async function handleQuery() {
    const term = document.getElementById('termInput').value.trim().toLowerCase();
    if (!termDictionary[term]) {
        showMessage("未找到该术语！", "error");
        return;
    }

    // 3. 官方规范：创建支付（三阶段流程）
    try {
        showMessage("正在创建支付请求...");
        const payment = await Pi.createPayment(
            // 支付参数
            {
                amount: 0.01,
                memo: `查询术语：${termDictionary[term].name}`,
                metadata: { term: term }
            },
            // 支付回调（官方强制要求）
            {
                onReadyForServerApproval: (paymentId) => serverApprovePayment(paymentId),
                onReadyForServerCompletion: (paymentId, txid) => serverCompletePayment(paymentId, txid, term),
                onCancel: (paymentId) => showMessage("支付已取消", "error"),
                onError: (error) => showMessage(`支付错误：${error.message}`, "error")
            }
        );
    } catch (error) {
        showMessage(`支付创建失败：${error.message}`, "error");
    }
}

// 3. 官方规范：服务端审批支付（必须调用Pi API）
async function serverApprovePayment(paymentId) {
    try {
        // 官方要求：后端调用Pi的/approve接口（此处用前端模拟，实际需后端实现）
        const response = await fetch("https://api.minepi.com/v2/payments/" + paymentId + "/approve", {
            method: "POST",
            headers: {
                "Authorization": "Key " + appAPIKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ approved: true })
        });
        if (!response.ok) throw new Error("服务端审批失败");
        showMessage("支付已审批，请在钱包中确认...");
    } catch (error) {
        showMessage(`审批失败：${error.message}`, "error");
    }
}

// 4. 官方规范：服务端完成支付（必须调用Pi API）
async function serverCompletePayment(paymentId, txid, term) {
    try {
        // 官方要求：后端调用Pi的/complete接口
        const response = await fetch("https://api.minepi.com/v2/payments/" + paymentId + "/complete", {
            method: "POST",
            headers: {
                "Authorization": "Key " + appAPIKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ txid: txid })
        });
        if (!response.ok) throw new Error("服务端完成支付失败");

        // 支付成功，显示释义
        showMessage("支付成功！", "success");
        displayDefinition(term);
    } catch (error) {
        showMessage(`支付完成失败：${error.message}`, "error");
    }
}

// 显示术语释义
function displayDefinition(term) {
    const info = termDictionary[term];
    document.getElementById('definition').innerHTML = `<h4>${info.name}</h4><p>${info.definition}</p>`;
    document.getElementById('definitionSection').style.display = "block";
}

// 辅助函数：启用/禁用查询按钮
function toggleQueryBtn() {
    const input = document.getElementById('termInput').value.trim();
    document.getElementById('queryBtn').disabled = !(isAuthenticated && input);
}

// 辅助函数：显示消息
function showMessage(text, type = "") {
    const el = document.getElementById('paymentInfo');
    el.textContent = text;
    el.className = "payment-info " + type;
    el.style.display = "block";
    if (type !== "error") setTimeout(() => el.style.display = "none", 3000);
}
