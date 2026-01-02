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

async function initPiSDK() {
    try {
        await Pi.init({
            version: "2.0",
            sandbox: true
        });
        console.log('Pi SDK initialized successfully');
    } catch (error) {
        console.error('Pi SDK initialization failed:', error);
        showError('SDK初始化失败，请刷新页面重试');
    }
}

async function authenticate() {
    try {
        showLoading(true);
        
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

        if (authResult && authResult.user) {
            currentUser = authResult.user;
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('querySection').style.display = 'block';
            document.getElementById('username').textContent = `欢迎, ${currentUser.username}!`;
            document.getElementById('authStatus').textContent = '';
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

async function createPayment(term) {
    try {
        showLoading(true);
        
        const paymentData = {
            amount: 0.01,
            memo: `查询术语: ${termDictionary[term].name}`,
            metadata: { 
                term: term,
                timestamp: Date.now()
            }
        };

        console.log('Creating payment with data:', paymentData);

        const payment = await Pi.createPayment(paymentData);
        
        console.log('Payment created:', payment);
        
        return payment;
    } catch (error) {
        console.error('Payment creation error:', error);
        throw new Error('支付创建失败：' + (error.message || '未知错误'));
    } finally {
        showLoading(false);
    }
}

async function handlePaymentCompletion(paymentId) {
    try {
        showLoading(true);
        
        const payment = await Pi.getPayment(paymentId);
        console.log('Payment status:', payment);

        if (payment && payment.status === 'completed') {
            const term = payment.metadata.term;
            displayResult(term);
            return true;
        } else if (payment && payment.status === 'failed') {
            showError('支付失败，请重试');
            return false;
        } else {
            showError('支付处理中，请稍后查看');
            return false;
        }
    } catch (error) {
        console.error('Payment completion check error:', error);
        showError('支付状态检查失败');
        return false;
    } finally {
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
    }, 5000);
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

    try {
        const payment = await createPayment(term);
        
        if (payment && payment.identifier) {
            const success = await handlePaymentCompletion(payment.identifier);
            
            if (!success) {
                showError('支付未完成，请检查您的Pi钱包');
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        showError(error.message || '查询失败，请重试');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initPiSDK();
    
    document.getElementById('authBtn').addEventListener('click', authenticate);
    document.getElementById('searchBtn').addEventListener('click', searchTerm);
    
    document.getElementById('termInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchTerm();
        }
    });
});
