// auth.js — Аутентификация с безопасной проверкой администратора (без Cloud Functions)

let auth = null;
let db = null;
let currentUserData = null;
let authInitialized = false;

// ========== EMAIL АДМИНИСТРАТОРА ==========
// ВАЖНО: Это НЕ используется для безопасности, только для UI!
// Реальная защита — в Firebase Rules
const ADMIN_EMAIL = "ygubert72@gmail.com";

// ========== ИНИЦИАЛИЗАЦИЯ FIREBASE ==========
function initFirebase() {
    if (typeof firebase === 'undefined') {
        setTimeout(initFirebase, 500);
        return;
    }
    
    if (!firebase.apps.length) {
        if (typeof firebaseConfig !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
        } else {
            console.error('❌ firebaseConfig не найден!');
            return;
        }
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    window.auth = auth;
    window.db = db;
    console.log('✅ Firebase инициализирован из auth.js');
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            if (window.Logger) Logger.info('Сессия будет сохраняться');
        })
        .catch((error) => {
            if (window.Logger) Logger.error('Ошибка настройки сохранения:', error);
        });
    
    if (window.Logger) Logger.info('Firebase готов');
    
    auth.onAuthStateChanged(async (user) => {
        authInitialized = true;
        console.log('🔐 authInitialized = true');
        
        if (user) {
            if (window.Logger) Logger.info('Пользователь в системе:', user.email);
            
            if (window.ActivityTracker) {
                await window.ActivityTracker.logUserActivity(user);
            }
            
            await loadUserData(user.uid);
            
            if (window.loadUserProgressFromFirebase) {
                await window.loadUserProgressFromFirebase();
            }
            
            await addUserToFirestore(user);
            await checkIfBlocked(user);
        } else {
            currentUserData = null;
            if (typeof window.clearAppState === 'function') {
                window.clearAppState();
            }
        }
        
        updateUI(user);
        updateLevelButtons();
        
        if (typeof window.onAuthReady === 'function') {
            console.log('🔄 Вызов onAuthReady из auth.js');
            window.onAuthReady();
        }
        
        if (typeof updateCounter === 'function') {
            updateCounter();
        }
    });
}

// ========== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ==========
async function loadUserData(uid) {
    if (!db) return;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            if (window.Logger) {
                Logger.info('Данные пользователя загружены, премиум:', currentUserData.hasPremiumAccess);
            }
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка загрузки данных пользователя:', e);
    }
}

// ========== ПРОВЕРКА ДОСТУПА К УРОВНЮ ==========
window.hasAccessToLevel = function(level) {
    if (!auth) {
        return level === 'A1';
    }
    
    // ===== БЕЗОПАСНАЯ ПРОВЕРКА =====
    // Администратор имеет доступ ко всем уровням
    if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
        return true;
    }
    
    if (level === 'A1') {
        return true;
    }
    
    if (level === 'A2') {
        return auth.currentUser !== null;
    }
    
    if (level === 'B1' || level === 'B2' || level === 'C1') {
        if (!auth.currentUser) return false;
        if (currentUserData && currentUserData.hasPremiumAccess === true) return true;
        return false;
    }
    
    return false;
};

// ========== ОБНОВЛЕНИЕ КНОПОК УРОВНЕЙ ==========
function updateLevelButtons() {
    if (!auth) {
        setTimeout(updateLevelButtons, 200);
        return;
    }
    
    const levelButtons = document.querySelectorAll('.btn-level');
    const levelButtonsMobile = document.querySelectorAll('#levelsContainerMobile .btn-level');
    const allButtons = [...levelButtons, ...levelButtonsMobile];
    
    allButtons.forEach(btn => {
        const level = btn.getAttribute('data-level');
        const hasAccess = window.hasAccessToLevel(level);
        
        if (hasAccess) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            btn.title = '';
            btn.classList.remove('locked');
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.style.cursor = 'not-allowed';
            btn.classList.add('locked');
            
            if (level === 'A2') {
                if (!auth.currentUser) {
                    btn.title = '🔐 Войдите в аккаунт';
                } else {
                    btn.title = '🔐 Требуется регистрация';
                }
            } else if (level === 'B1' || level === 'B2' || level === 'C1') {
                if (!auth.currentUser) {
                    btn.title = '🔐 Войдите в аккаунт и оплатите премиум';
                } else if (!currentUserData || !currentUserData.hasPremiumAccess) {
                    btn.title = '💎 Требуется премиум-доступ';
                } else {
                    btn.title = '🚫 Доступ запрещён';
                }
            }
        }
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
window.isAuthenticated = function() {
    return auth !== null && auth.currentUser !== null;
};

window.getCurrentUser = function() {
    return auth ? auth.currentUser : null;
};

// ========== БЕЗОПАСНАЯ ПРОВЕРКА АДМИНА ==========
// ВАЖНО: Реальная защита — в Firebase Rules!
// Эта функция используется ТОЛЬКО для UI (показать/скрыть кнопки)
window.isAdmin = function() {
    if (auth && auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
        return true;
    }
    return false;
};

// ========== ПОЛУЧИТЬ ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ==========
window.getCurrentUserData = function() {
    return currentUserData;
};

// ========== ПРОВЕРКА БЛОКИРОВКИ ==========
async function checkIfBlocked(user) {
    if (!db || !user) return;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().blocked === true) {
            alert('❌ Ваш аккаунт заблокирован. Обратитесь к администратору.');
            await auth.signOut();
            location.reload();
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка проверки блокировки:', e);
    }
}

// ========== ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
async function addUserToFirestore(user) {
    if (!db || !user) return;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                createdAt: new Date().toISOString(),
                hasPremiumAccess: false,
                premiumActivatedAt: null,
                blocked: false,
                status: 'ok',
                devices: [],
                flags: { totalFlags: 0 },
                _previousFlags: { totalFlags: 0 }
            });
            
            await db.collection('users').doc(user.uid)
                .collection('progress').doc('config').set({
                    created: new Date().toISOString()
                });
            
            if (window.Logger) Logger.info('Пользователь добавлен в Firestore:', user.email);
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка добавления пользователя:', e);
    }
}

// ========== ВХОД ==========
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        if (window.loadUserProgressFromFirebase) {
            await window.loadUserProgressFromFirebase();
        }
        if (window.Logger) Logger.info('Вход выполнен:', email);
        return { success: true };
    } catch(error) {
        if (window.Logger) Logger.error('Ошибка входа:', error.message);
        return { success: false, error: error.message };
    }
}

// ========== РЕГИСТРАЦИЯ ==========
async function register(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (db) {
            await db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                createdAt: new Date().toISOString(),
                hasPremiumAccess: false,
                premiumActivatedAt: null,
                blocked: false,
                status: 'ok',
                devices: [],
                flags: { totalFlags: 0 },
                _previousFlags: { totalFlags: 0 }
            });
            
            await db.collection('users').doc(userCredential.user.uid)
                .collection('progress').doc('config').set({
                    created: new Date().toISOString()
                });
        }
        if (window.Logger) Logger.info('Регистрация выполнена:', email);
        return { success: true };
    } catch(error) {
        if (window.Logger) Logger.error('Ошибка регистрации:', error.message);
        return { success: false, error: error.message };
    }
}

// ========== ВЫХОД ==========
window.logout = async function() {
    if (auth) {
        await auth.signOut();
        if (window.Logger) Logger.info('Выход выполнен');
    }
    if (typeof window.clearAppState === 'function') {
        window.clearAppState();
    }
    if (typeof window.showWelcomePage === 'function') {
        window.showWelcomePage();
    } else {
        location.reload();
    }
};

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const loginBtnMobile = document.getElementById('loginBtnMobile');
    const userInfoMobile = document.getElementById('userInfoMobile');
    const adminBtn = document.getElementById('adminPanelBtn');
    const adminBtnMobile = document.getElementById('adminPanelBtnMobile');
    
    if (!loginBtn || !userInfo) return;
    
    if (user) {
        loginBtn.style.display = 'none';
        if (loginBtnMobile) loginBtnMobile.style.display = 'none';
        
        userInfo.style.display = 'block';
        if (userInfoMobile) userInfoMobile.style.display = 'block';
        
        const hasPremium = currentUserData && currentUserData.hasPremiumAccess === true;
        const isAdmin = user.email === ADMIN_EMAIL;
        
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? 'block' : 'none';
        }
        if (adminBtnMobile) {
            adminBtnMobile.style.display = isAdmin ? 'block' : 'none';
        }
        
        const premiumButtonHtml = (!isAdmin) ? `
            <div style="margin-top:8px;">
                ${!hasPremium 
                    ? `<button id="premiumPayBtn" class="premium-pay-btn" style="width:100%; padding:8px; background:linear-gradient(135deg, #FFD700, #FFA500); color:#333; border:none; border-radius:16px; cursor:pointer; font-weight:bold; font-size:12px;">💎 ОПЛАТИТЬ ПРЕМИУМ</button>`
                    : `<div style="background:#4CAF50; border-radius:16px; padding:8px; text-align:center; color:white; font-weight:bold; font-size:12px;">✅ ПРЕМИУМ АКТИВЕН</div>`
                }
            </div>
        ` : '';
        
        const userInfoHtml = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:5px; flex-wrap:wrap;">
                    <span style="font-size:20px;">🎓</span>
                    <span style="word-break:break-all;">${user.email}</span>
                    ${isAdmin ? '<span style="background:#FF9800; border-radius:12px; padding:2px 10px; font-size:10px; color:white; font-weight:bold;">👑 АДМИН</span>' : ''}
                </div>
                <button onclick="window.logout()" style="margin-top:5px; padding:8px 12px; background:#4CAF50; color:white; border:none; border-radius:16px; cursor:pointer; width:100%; font-size:12px; font-weight:bold;">🚪 Выйти</button>
                ${premiumButtonHtml}
            </div>
        `;
        
        userInfo.innerHTML = userInfoHtml;
        if (userInfoMobile) userInfoMobile.innerHTML = userInfoHtml;
        
        if (!isAdmin && !hasPremium) {
            setTimeout(() => {
                const payBtn = document.getElementById('premiumPayBtn');
                if (payBtn) payBtn.onclick = () => showPaymentModal();
                const payBtnMobile = document.getElementById('premiumPayBtnMobile');
                if (payBtnMobile) payBtnMobile.onclick = () => showPaymentModal();
            }, 100);
        }
        
    } else {
        loginBtn.style.display = 'block';
        if (loginBtnMobile) loginBtnMobile.style.display = 'block';
        
        userInfo.style.display = 'block';
        if (userInfoMobile) userInfoMobile.style.display = 'block';
        
        if (adminBtn) adminBtn.style.display = 'none';
        if (adminBtnMobile) adminBtnMobile.style.display = 'none';
        
        const guestHtml = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="font-size:14px; font-weight:bold;">👋 Гостевой режим</div>
                <div style="font-size:11px; color:#666; margin-top:4px;">доступен уровень A1</div>
                <div style="font-size:11px; color:#666; margin-top:2px;">A2 — доступен после регистрации</div>
                <div style="font-size:11px; color:#666; margin-top:2px;">B1-C1 — доступны с премиумом</div>
            </div>
        `;
        
        userInfo.innerHTML = guestHtml;
        if (userInfoMobile) userInfoMobile.innerHTML = guestHtml;
        
        loginBtn.onclick = () => showLoginModal();
        if (loginBtnMobile) loginBtnMobile.onclick = () => showLoginModal();
    }
}

// ========== МОДАЛЬНОЕ ОКНО ОПЛАТЫ ==========
function showPaymentModal() {
    if (!auth.currentUser) {
        alert('Сначала войдите в аккаунт');
        showLoginModal();
        return;
    }
    
    if (currentUserData && currentUserData.hasPremiumAccess === true) {
        alert('💎 У вас уже есть премиум-доступ!');
        return;
    }
    
    const PREMIUM_PRICE = 500;
    const CONTACTS = {
        telegram: "@SEO_2020",
        email: "ygubert72@gmail.com"
    };
    
    const oldModal = document.getElementById('paymentModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000000; overflow:auto;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:white; border-radius:20px; max-width:400px; width:90%; padding:25px; text-align:center; margin:20px; max-height:90vh; overflow-y:auto; position:relative;';
    
    modalContent.innerHTML = `
        <button id="paymentCloseCross" style="
            position: absolute;
            top: 12px;
            right: 16px;
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #999;
            padding: 0 5px;
            line-height: 1;
            transition: color 0.2s;
        " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">✕</button>
        
        <h2 style="margin:0 0 10px 0; font-size:22px;">💎 Премиум доступ</h2>
        <div style="font-size:13px; color:#666; margin-bottom:15px;">Уровни B1, B2, C1</div>
        <div style="font-size:32px; color:#3B6FE0; font-weight:bold; margin-bottom:10px;">${PREMIUM_PRICE} ₽</div>
        <div style="font-size:11px; color:#666; margin-bottom:15px;">Разовый платёж / бессрочный доступ</div>
        
        <div style="background:#f5f5f5; border-radius:12px; padding:12px; margin-bottom:15px; text-align:left;">
            <div style="margin-bottom:6px; font-size:13px;">✅ Все уровни немецкого (A1-C1)</div>
            <div style="margin-bottom:6px; font-size:13px;">✅ Все уроки грамматики</div>
            <div style="margin-bottom:6px; font-size:13px;">✅ Тренажёры и тесты</div>
            <div style="font-size:13px;">✅ Сохранение прогресса в облаке</div>
        </div>
        
        <div style="background:#FFF3E0; border-radius:12px; padding:15px; margin-bottom:15px; text-align:center;">
            <div style="font-weight:bold; margin-bottom:12px; font-size:14px;">📱 Свяжитесь с нами любым удобным способом:</div>
            <div style="margin:8px 0;">
                <div style="background:#0088cc; color:white; padding:10px; border-radius:10px; margin:5px 0; font-size:14px;">
                    📲 Telegram: <strong>${CONTACTS.telegram}</strong>
                </div>
                <div style="background:#EA4335; color:white; padding:10px; border-radius:10px; margin:5px 0; font-size:14px;">
                    📧 Email: <strong>${CONTACTS.email}</strong>
                </div>
            </div>
            <div style="font-size:14px; color:#333; margin-top:12px; padding:8px; background:#fff; border-radius:8px; font-weight:bold;">
                📧 В сообщении укажите ваш email: <strong style="color:#3B6FE0;">${auth.currentUser.email}</strong>
            </div>
        </div>
        
        <button id="paymentCloseBtn" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:12px; cursor:pointer; font-size:14px; font-weight:bold;">Закрыть</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('paymentCloseCross').onclick = function() { modal.remove(); };
    document.getElementById('paymentCloseBtn').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
}

// ========== МОДАЛЬНОЕ ОКНО ВХОДА/РЕГИСТРАЦИИ ==========
window.showLoginModal = function() {
    if (document.getElementById('authModal')) {
        document.getElementById('authModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:999999;">
            <div style="background:white; border-radius:20px; max-width:400px; width:90%; padding:25px;">
                <h2 style="text-align:center; margin:0 0 20px 0;">🔐 Deutsch-Meister</h2>
                
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <button id="loginTab" style="flex:1; padding:10px; background:#3B6FE0; color:white; border:none; border-radius:10px; cursor:pointer;">Вход</button>
                    <button id="registerTab" style="flex:1; padding:10px; background:#E0E0E0; border:none; border-radius:10px; cursor:pointer;">Регистрация</button>
                </div>
                
                <input type="email" id="authEmail" placeholder="Email" style="width:100%; padding:8px; font-size:13px; margin:6px 0; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box;">
                
                <div style="position: relative; margin:6px 0;">
                    <input type="password" id="authPassword" placeholder="Пароль (мин. 6 симв.)" style="width:100%; padding:8px; font-size:13px; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box; padding-right: 30px;">
                    <span id="togglePasswordEye" onclick="togglePasswordVisibility('authPassword', 'togglePasswordEye')" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 13px; line-height: 1; user-select: none;">👁️</span>
                </div>
                
                <div id="confirmPasswordContainer" style="position: relative; margin:6px 0; display: none;">
                    <input type="password" id="authConfirmPassword" placeholder="Повторите пароль" style="width:100%; padding:8px; font-size:13px; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box; padding-right: 30px;">
                    <span id="toggleConfirmEye" onclick="togglePasswordVisibility('authConfirmPassword', 'toggleConfirmEye')" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 13px; line-height: 1; user-select: none;">👁️</span>
                </div>
                
                <button id="actionBtn" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:10px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>
                
                <button id="guestBtn" style="width:100%; margin-top:10px; padding:10px; background:#F5F5F5; border:2px solid #E0E0E0; border-radius:10px; cursor:pointer;">👤 Продолжить без регистрации</button>
                
                <button id="closeModal" style="width:100%; margin-top:10px; padding:8px; background:none; border:none; cursor:pointer; color:#999;">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    let isLogin = true;
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const actionBtn = document.getElementById('actionBtn');
    const emailInput = document.getElementById('authEmail');
    const passInput = document.getElementById('authPassword');
    const confirmContainer = document.getElementById('confirmPasswordContainer');
    const confirmInput = document.getElementById('authConfirmPassword');
    
    loginTab.onclick = () => {
        isLogin = true;
        loginTab.style.background = '#3B6FE0';
        loginTab.style.color = 'white';
        registerTab.style.background = '#E0E0E0';
        registerTab.style.color = 'black';
        actionBtn.textContent = 'Войти';
        confirmContainer.style.display = 'none';
    };
    
    registerTab.onclick = () => {
        isLogin = false;
        registerTab.style.background = '#3B6FE0';
        registerTab.style.color = 'white';
        loginTab.style.background = '#E0E0E0';
        loginTab.style.color = 'black';
        actionBtn.textContent = 'Зарегистрироваться';
        confirmContainer.style.display = 'block';
    };
    
    actionBtn.onclick = async () => {
        const email = emailInput.value.trim();
        const password = passInput.value;
        
        if (!email || !password) {
            alert('Введите email и пароль');
            return;
        }
        
        if (!isLogin && password.length < 6) {
            alert('Пароль должен быть минимум 6 символов');
            return;
        }
        
        if (!isLogin) {
            const confirmPassword = confirmInput.value;
            if (password !== confirmPassword) {
                alert('❌ Пароли не совпадают!');
                return;
            }
        }
        
        try {
            if (isLogin) {
                const result = await login(email, password);
                if (result.success) {
                    modal.remove();
                } else {
                    alert('Ошибка входа: ' + result.error);
                }
            } else {
                const result = await register(email, password);
                if (result.success) {
                    alert('Регистрация успешна! Добро пожаловать, ' + email + '!');
                    modal.remove();
                } else {
                    alert('Ошибка регистрации: ' + result.error);
                }
            }
        } catch(error) {
            let msg = 'Ошибка: ';
            if (error.code === 'auth/invalid-credential') msg = 'Неверный email или пароль';
            else if (error.code === 'auth/email-already-in-use') msg = 'Этот email уже зарегистрирован';
            else if (error.code === 'auth/weak-password') msg = 'Пароль слишком слабый (минимум 6 символов)';
            else if (error.code === 'auth/user-not-found') msg = 'Пользователь не найден';
            else if (error.code === 'auth/wrong-password') msg = 'Неверный пароль';
            else if (error.code === 'auth/too-many-requests') msg = 'Слишком много попыток. Попробуйте позже';
            else msg += error.message;
            alert(msg);
        }
    };
    
    document.getElementById('guestBtn').onclick = () => {
        modal.remove();
        alert('Гостевой режим (доступен уровень A1, прогресс не сохраняется)');
    };
    
    document.getElementById('closeModal').onclick = () => modal.remove();
};

// ========== ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ ПАРОЛЯ ==========
function togglePasswordVisibility(inputId, eyeIconId) {
    const input = document.getElementById(inputId);
    const eyeIcon = document.getElementById(eyeIconId);
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = '🙈';
    } else {
        input.type = 'password';
        eyeIcon.textContent = '👁️';
    }
}

// ========== ПОЛУЧИТЬ ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ==========
window.getCurrentUserData = function() {
    return currentUserData;
};

// ========== ЗАПУСК ==========
window.addEventListener('load', function() {
    if (window.Logger) Logger.info('Загрузка страницы...');
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.background = '#4CAF50';
        loginBtn.style.color = 'white';
        loginBtn.innerHTML = '🔐 Войти';
    }
    
    if (typeof firebase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        script.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
            authScript.onload = () => {
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
                firestoreScript.onload = initFirebase;
                document.head.appendChild(firestoreScript);
            };
            document.head.appendChild(authScript);
        };
        document.head.appendChild(script);
    } else {
        initFirebase();
    }
});

window.auth = auth;
window.db = db;
window.currentUserData = currentUserData;
window.authInitialized = authInitialized;

// ===== ЭКСПОРТ ФУНКЦИЙ ДЛЯ СОВМЕСТИМОСТИ =====
if (!window.saveUserProgressToFirebase) {
    window.saveUserProgressToFirebase = async function() {
        if (window.ActivityTracker && window.ActivityTracker.saveProgressToFirebase) {
            await window.ActivityTracker.saveProgressToFirebase();
        }
    };
}

if (!window.loadUserProgressFromFirebase) {
    window.loadUserProgressFromFirebase = async function() {
        if (window.ActivityTracker && window.ActivityTracker.loadProgressFromFirebase) {
            return await window.ActivityTracker.loadProgressFromFirebase();
        }
        return false;
    };
}

console.log('✅ auth.js загружен (безопасная версия)');
