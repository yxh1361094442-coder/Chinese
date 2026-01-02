// 全局配置
let isAuthenticated = false;
let currentUser = null;
// 你的后端Vercel域名（已配置正确）
const BACKEND_URL = "https://chinese-cnbg.vercel.app/";

// 术语库
const termDictionary = {
    "node": { name: "Node", definition: "节点：Pi网络的核心计算单元，负责维护网络安全。" },
    "testnet": { name: "Testnet", definition: "测试网：Pi的测试环境，不涉及真实Pi币。" },
    "mainnet": { name: "Mainnet", definition: "主网：Pi的正式运行网络，支持真实Pi币交易。" },
    "staking": { name: "Staking", definition: "质押：锁定Pi币以获得额外奖励的机制。" },
    "mining": { name: "Mining", definition: "挖矿：参与Pi网络共识以获取Pi币的过程。" }
};

// 页面加载完成初始化（核心：开启沙盒模式）
document.addEventListener('DOMContentLoaded', () => {
    // 初始化Pi SDK（必须开启sandbox: true，解决支付超时）
    Pi.init({ version: "2.0", sandbox: true });
    
    // 绑定事件
    document.getElementById('authBtn').addEventListener('click', authenticateUser);
    document.getElementById('queryBtn').addEventListener('click', handleQuery);
    document.getElementById('termInput').addEventListener('input', toggleQueryBtn);
});

// 1. Pi账号授权（修复兼容问题）
async function authenticateUser() {
    try {
        showMessage("正在请求Pi账号授权...");
        // 简化授权逻辑，兼容所有Pi Browser版本
        const authResult = await Pi.authenticate(['username', 'payments']);
        
        // 授权成功
        isAuthenticated = true;
        currentUser = authResult.user;
        document.getElementById('authStatus').innerHTML = `<p>已授权：${currentUser.username}</p>`;
        showMessage("授权成功！", "success");
        
        // 解锁查询按钮
        toggleQueryBtn();
    } catch (error) {
        showMessage(`授权失败：${error.message}`, "error");
        console.log("授权错误：", error);
    }
}

// 2. 处理术语查询+支付
async function handleQuery() {
    const term = document.getElementById('termInput').value.trim().toLowerCase();
    
    // 校验
    if (!termDictionary[term]) return showMessage("未找到该术语！", "error");
    if (!isAuthenticated) return showMessage("请先授权Pi账号！", "error");
    if (BACKEND_URL === "你的后端域名") return showMessage("请先配置后端域名！", "error");

    try {
        showMessage("正在创建支付请求...");
        // 创建Pi支付（沙盒模式）
        const payment = await Pi.createPayment(
            { amount: 0.01, memo: `查询术语：${termDictionary[term].name}`, metadata: { term } },
            {
                onReadyForServerApproval: (paymentId) => serverApprovePayment(paymentId),
                onReadyForServerCompletion: (paymentId, txid) => serverCompletePayment(paymentId, txid, term),
                onCancel: () => showMessage("支付已取消", "error"),
                onError: (err) => showMessage(`支付错误：${err.message}`, "error")
            }
        );
    } catch (error) {
        showMessage(`支付创建失败：${error.message}`, "error");
    }
}

// 3. 调用后端审批支付（接口路径已修复）
async function serverApprovePayment(paymentId) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/approve-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "审批失败");
        showMessage("支付已审批，请在钱包中确认...");
    } catch (err) {
        showMessage(`审批失败：${err.message}`, "error");
    }
}

// 4. 调用后端完成支付（接口路径已修复）
async function serverCompletePayment(paymentId, txid, term) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/complete-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "完成支付失败");
        showMessage("支付成功！", "success");
        displayDefinition(term);
    } catch (err) {
        showMessage(`支付完成失败：${err.message}`, "error");
    }
}

// 显示术语释义
function displayDefinition(term) {
    const info = termDictionary[term];
    document.getElementById('definition').innerHTML = `<h4>${info.name}</h4><p>${info.definition}</p>`;
    document.getElementById('definitionSection').style.display = "block";
}

// 解锁查询按钮（输入框有内容+已授权）
function toggleQueryBtn() {
    const inputVal = document.getElementById('termInput').value.trim();
    document.getElementById('queryBtn').disabled = !(isAuthenticated && inputVal);
}

// 消息提示
function showMessage(text, type = "") {
    const el = document.getElementById('paymentInfo');
    el.textContent = text;
    el.className = `payment-info ${type}`;
    el.style.display = "block";
    if (type !== "error") setTimeout(() => el.style.display = "none", 3000);
}
