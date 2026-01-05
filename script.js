const termDictionary = {
    "node": {
        name: "Node",
        definition: "节点：Pi网络中的计算机或服务器，负责验证交易和维护网络安全。节点是Pi网络的基础设施，通过运行节点软件参与网络的共识机制。"
    },
    "testnet": {
        name: "Testnet",
        definition: "测试网：Pi网络的测试环境，用于测试新功能和交易，不涉及真实Pi币。开发者和先锋可以在测试网上安全地测试应用和功能，不会影响主网资产。"
    },
    "mainnet": {
        name: "Mainnet",
        definition: "主网：Pi网络的正式运行环境，处理真实的Pi币交易。主网是Pi网络的核心，所有真实的交易和价值转移都在主网上进行。"
    },
    "staking": {
        name: "Staking",
        definition: "质押：将Pi币锁定在钱包中以支持网络安全和获得奖励。质押是一种激励机制，鼓励用户长期持有Pi币并参与网络治理。"
    },
    "mining": {
        name: "Mining",
        definition: "挖矿：通过手机应用每天点击挖矿按钮获得Pi币的过程。Pi采用独特的移动挖矿机制，用户只需每天登录应用即可参与挖矿。"
    },
    "balance": {
        name: "Balance",
        definition: "余额：用户钱包中持有的Pi币数量。余额显示用户可用的Pi币，包括已锁定和未锁定的部分。"
    },
    "security circle": {
        name: "Security Circle",
        definition: "安全圈：用户信任的5个Pi用户组成的信任网络，用于保护账户安全。安全圈是Pi网络独特的安全机制，通过社交信任关系增强账户安全性。"
    },
    "developer portal": {
        name: "Developer Portal",
        definition: "开发者门户：Pi Network提供的开发者平台，用于创建和管理Pi应用。开发者可以在门户中注册应用、获取API密钥和查看应用统计。"
    },
    "sdk": {
        name: "SDK",
        definition: "软件开发工具包：Pi Network提供的开发工具包，用于集成Pi支付和身份验证功能。SDK简化了开发流程，让开发者能够轻松构建Pi生态应用。"
    },
    "checklist": {
        name: "Checklist",
        definition: "检查清单：Pi主网迁移的完成度清单，包括KYC、锁定等要求。用户需要完成检查清单中的所有项目才能将Pi币迁移到主网。"
    }
};

let currentUser = null;
let isPiBrowser = false;
const API_BASE_URL = window.location.origin;

async function initPiSDK() {
    try {
        console.log('=== Pi SDK 初始化开始 ===');
        console.log('当前URL:', window.location.href);
        console.log('User Agent:', navigator.userAgent);
        
        isPiBrowser = /PiBrowser/i.test(navigator.userAgent);
        console.log('是否在Pi Browser中:', isPiBrowser);
        
        if (!isPiBrowser) {
            console.warn('警告：不在Pi Browser中运行，支付功能可能无法正常工作');
        }
        
        await Pi.init({
            version: "2.0",
            sandbox: true
        });
        
        console.log('Pi SDK initialized successfully');
        console.log('Pi object:', typeof Pi, Object.keys(Pi));
        console.log('Pi.createPayment exists:', typeof Pi.createPayment);
        
    } catch (error) {
        console.error('Pi SDK initialization failed:', error);
        showError('SDK初始化失败：' + error.message);
    }
}

async function authenticate() {
    try {
        showLoading(true);
        console.log('=== 开始授权 ===');
        
        const authResult = await Pi.authenticate(['username'], {
            onIncompletePaymentFound: (payment) => {
                console.log('Found incomplete payment:', payment);
                return Pi.createPayment({
                    amount: payment.amount,
                    memo: payment.memo,
                    metadata: payment.metadata
                });
            }
        });

        console.log('授权结果:', authResult);

        if (authResult && authResult.user) {
            currentUser = authResult.user;
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('querySection').style.display = 'block';
            document.getElementById('username').textContent = `欢迎, ${currentUser.username}!`;
            document.getElementById('authStatus').textContent = '';
            console.log('授权成功，用户:', currentUser);
        } else {
            showError('授权失败，请重试');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showError('授权失败：' + (error.message || '未知错误'));
    } finally {
        showLoading(false);
    }
}

async function approvePayment(paymentId) {
    try {
        console.log('调用后端批准支付:', paymentId);
        
        const response = await fetch(`${API_BASE_URL}/api/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paymentId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '支付批准失败');
        }

        console.log('支付批准成功:', data);
        return data;
    } catch (error) {
        console.error('批准支付错误:', error);
        throw error;
    }
}

async function completePaymentBackend(paymentId, txid) {
    try {
        console.log('调用后端完成支付:', paymentId, txid);
        
        const response = await fetch(`${API_BASE_URL}/api/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paymentId, txid })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '支付完成失败');
        }

        console.log('支付完成成功:', data);
        return data;
    } catch (error) {
        console.error('完成支付错误:', error);
        throw error;
    }
}

async function createPayment(term) {
    try {
        console.log('=== 开始创建支付 ===');
        showLoading(true);
        
        if (!isPiBrowser) {
            showError('请使用Pi Browser打开此应用以完成支付');
            showLoading(false);
            return;
        }
        
        const paymentData = {
            amount: 0.01,
            memo: `查询术语: ${termDictionary[term].name}`,
            metadata: { 
                term: term,
                timestamp: Date.now()
            }
        };

        console.log('支付数据:', paymentData);
        console.log('Pi.createPayment 类型:', typeof Pi.createPayment);

        if (typeof Pi.createPayment !== 'function') {
            throw new Error('Pi.createPayment 不是一个函数，SDK可能未正确加载');
        }

        const payment = await Pi.createPayment(paymentData, {
            onReadyForServerApproval: async (paymentId) => {
                console.log('Payment ready for server approval:', paymentId);
                try {
                    await approvePayment(paymentId);
                } catch (error) {
                    console.error('Server approval failed:', error);
                    showError('支付批准失败：' + error.message);
                }
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
                console.log('Payment ready for server completion:', paymentId, txid);
                try {
                    await completePaymentBackend(paymentId, txid);
                    displayResult(term);
                } catch (error) {
                    console.error('Server completion failed:', error);
                    showError('支付完成失败：' + error.message);
                }
                showLoading(false);
            },
            onCancelled: (paymentId) => {
                console.log('Payment cancelled:', paymentId);
                showError('支付已取消');
                showLoading(false);
            },
            onError: (error, payment) => {
                console.error('Payment error:', error, payment);
                showError('支付错误：' + (error.message || '未知错误'));
                showLoading(false);
            }
        });
        
        console.log('Payment created:', payment);
        
    } catch (error) {
        console.error('Payment creation error:', error);
        console.error('Error stack:', error.stack);
        showError('支付创建失败：' + (error.message || '未知错误'));
        showLoading(false);
    }
}

function displayResult(term) {
    const resultDiv = document.getElementById('result');
    const termData = termDictionary[term];
    
    resultDiv.innerHTML = `
        <h3>${termData.name}</h3>
        <p>${termData.definition}</p>
    `;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 8000);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

async function searchTerm() {
    const termInput = document.getElementById('termInput');
    const term = termInput.value.trim().toLowerCase();

    if (!term) {
        showError('请输入要查询的术语');
        return;
    }

    if (!termDictionary[term]) {
        showError('该术语暂不支持查询，请尝试：Node、Testnet、Mainnet、Staking、Mining、Balance、Security Circle、Developer Portal、SDK、Checklist');
        return;
    }

    await createPayment(term);
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== 页面加载完成 ===');
    await initPiSDK();
    
    document.getElementById('authBtn').addEventListener('click', authenticate);
    document.getElementById('searchBtn').addEventListener('click', searchTerm);
    
    document.getElementById('termInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchTerm();
        }
    });
});
