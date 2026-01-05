// Pi Network 应用配置
const PI_CONFIG = {
    // 确保使用您自己的应用ID
    appId: 'your-pi-app-id-here',
    version: '1.0',
    sandbox: true // 在开发阶段使用沙盒模式
};

// 全局变量
let piUser = null;
let pi = null;

// DOM 元素
const userInfo = document.getElementById('userInfo');
const username = document.getElementById('username');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const paymentSection = document.getElementById('paymentSection');
const paymentForm = document.getElementById('paymentForm');
const loading = document.getElementById('loading');
const error = document.getElementById('error');

// 页面加载完成后初始化 Pi SDK
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，初始化 Pi SDK...');
    initPiSDK();
});

// 初始化 Pi SDK
function initPiSDK() {
    try {
        if (typeof Pi === 'undefined') {
            showError('Pi SDK 未加载，请检查网络连接');
            return;
        }
        
        pi = Pi;
        
        // 初始化 SDK
        pi.init({
            version: PI_CONFIG.version,
            sandbox: PI_CONFIG.sandbox,
            scope: ['username', 'payments'] // 请求必要的权限
        }).then(function() {
            console.log('Pi SDK 初始化成功');
            
            // 检查用户是否已经登录
            checkLoginStatus();
        }).catch(function(err) {
            console.error('Pi SDK 初始化失败:', err);
            showError('Pi SDK 初始化失败: ' + err.message);
        });
        
    } catch (err) {
        console.error('初始化过程中发生错误:', err);
        showError('初始化过程中发生错误: ' + err.message);
    }
}

// 检查用户登录状态
function checkLoginStatus() {
    if (!pi) return;
    
    showLoading(true);
    
    pi.authenticate({
        onApproved: function(authResult) {
            console.log('用户已登录:', authResult);
            handleAuthSuccess(authResult);
        },
        onDenied: function() {
            console.log('用户拒绝登录');
            showLoading(false);
        },
        onError: function(err) {
            console.error('登录检查错误:', err);
            showError('登录检查错误: ' + err.message);
            showLoading(false);
        }
    });
}

// 处理用户认证成功
function handleAuthSuccess(authResult) {
    try {
        piUser = authResult.user;
        
        // 更新 UI
        username.textContent = piUser.username;
        userInfo.classList.remove('hidden');
        loginSection.classList.add('hidden');
        paymentSection.classList.remove('hidden');
        showLoading(false);
        clearError();
        
        console.log('用户认证成功，显示支付界面');
        
    } catch (err) {
        console.error('处理认证结果时出错:', err);
        showError('处理登录信息时出错: ' + err.message);
        showLoading(false);
    }
}

// 用户认证函数
function authenticate() {
    if (!pi) {
        showError('Pi SDK 未初始化');
        return;
    }
    
    showLoading(true);
    clearError();
    
    console.log('开始用户认证...');
    
    pi.authenticate({
        scope: ['username', 'payments'],
        onApproved: function(authResult) {
            console.log('认证成功:', authResult);
            handleAuthSuccess(authResult);
        },
        onDenied: function() {
            console.log('用户拒绝认证');
            showError('用户拒绝登录');
            showLoading(false);
        },
        onError: function(err) {
            console.error('认证错误:', err);
            showError('登录失败: ' + err.message);
            showLoading(false);
        }
    });
}

// 退出登录
logoutBtn.addEventListener('click', function() {
    if (!pi) return;
    
    // 清除用户信息
    piUser = null;
    
    // 更新 UI
    userInfo.classList.add('hidden');
    loginSection.classList.remove('hidden');
    paymentSection.classList.add('hidden');
    
    console.log('用户已退出登录');
});

// 支付表单提交事件
paymentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!piUser) {
        showError('请先登录');
        return;
    }
    
    const amount = parseFloat(document.getElementById('amount').value);
    const memo = document.getElementById('memo').value;
    
    // 验证输入
    if (isNaN(amount) || amount <= 0) {
        showError('请输入有效的金额');
        return;
    }
    
    createPayment(amount, memo);
});

// 创建支付
function createPayment(amount, memo = '') {
    if (!pi) {
        showError('Pi SDK 未初始化');
        return;
    }
    
    showLoading(true);
    clearError();
    
    console.log('创建支付:', { amount, memo });
    
    try {
        pi.createPayment({
            amount: amount,
            memo: memo,
            metadata: { 
                // 可以添加自定义元数据
                userId: piUser.uid,
                timestamp: Date.now()
            },
            onReadyForServerApproval: function(paymentId) {
                console.log('支付准备就绪，等待服务器审批:', paymentId);
                
                // 在这个阶段，您需要将 paymentId 发送到您的后端进行审批
                // 这里我们简化处理，直接调用 Pi API 进行审批
                approvePayment(paymentId);
            },
            onReadyForServerCompletion: function(paymentId, txid) {
                console.log('支付完成，等待服务器确认:', { paymentId, txid });
                
                // 在实际应用中，您应该将这些信息发送到后端进行最终确认
                completePayment(paymentId, txid);
            },
            onCancel: function(paymentId) {
                console.log('用户取消支付:', paymentId);
                showError('支付已取消');
                showLoading(false);
            },
            onError: function(err) {
                console.error('支付创建失败:', err);
                showError('支付创建失败: ' + err.message);
                showLoading(false);
            }
        });
    } catch (err) {
        console.error('创建支付时发生异常:', err);
        showError('创建支付时发生异常: ' + err.message);
        showLoading(false);
    }
}

// 审批支付（简化版本，实际应该在后端完成）
function approvePayment(paymentId) {
    console.log('审批支付:', paymentId);
    
    // 注意：在生产环境中，这一步必须在后端完成
    // 这里我们使用前端简化处理（仅用于开发和测试）
    
    // 直接完成支付流程
    completePayment(paymentId, 'test-txid-' + Date.now());
}

// 完成支付（简化版本，实际应该在后端完成）
function completePayment(paymentId, txid) {
    console.log('完成支付:', { paymentId, txid });
    
    // 注意：在生产环境中，这一步必须在后端完成
    // 这里我们使用前端简化处理（仅用于开发和测试）
    
    showLoading(false);
    alert('支付完成！\n支付ID: ' + paymentId + '\n交易ID: ' + txid);
    console.log('支付流程完成');
}

// 显示加载状态
function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// 显示错误信息
function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

// 清除错误信息
function clearError() {
    error.textContent = '';
    error.classList.add('hidden');
}

// 辅助函数：生成唯一ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
