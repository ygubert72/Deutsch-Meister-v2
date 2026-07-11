// auth.js — ТОЛЬКО вход, выход, регистрация и состояние пользователя

let auth = null;
let db = null;
let currentUserData = null;
let authInitialized = false;

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
        
        if (user) {
            if (window.Logger) Logger.info('Пользователь в системе:', user.email);
            
            if (window.ActivityTracker) {
                await window.ActivityTracker.logUserActivity(user);
            }
            
            await loadUserData(user.uid);
            await window.loadUserProgressFromFirebase();
            await addUserToFirestore(user);
            await checkIfBlocked(user);
        } else {
            currentUserData = null;
            setTimeout(() => {
                if (typeof window.applyAppState === 'function' && !window.stateApplied) {
                    console.log('👤 Пользователь вышел, применяем состояние из localStorage');
                    window.applyAppState();
                }
            }, 100);
        }
        
        updateUI(user);
        updateLevelButtons();
        
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
    // Безопасная проверка: если auth ещё не инициализирован — доступен только A1
    if (!auth) {
        return level === 'A1';
    }
    
    // Админ имеет доступ ко всем уровням
    if (auth.currentUser && auth.currentUser.email === 'ygubert72@gmail.com') {
        return true;
    }
    
    // Уровень A1 доступен всем (даже без регистрации)
    if (level === 'A1') {
        return true;
    }
    
    // Уровни A2, B1, B2, C1 — только с регистрацией И премиумом
    if (level === 'A2' || level === 'B1' || level === 'B2' || level === 'C1') {
        if (!auth.currentUser) return false;
        if (currentUserData && currentUserData.hasPremiumAccess === true) return true;
        return false;
    }
    
    return false;
};

// ========== ОБНОВЛЕНИЕ КНОПОК УРОВНЕЙ ==========
function updateLevelButtons() {
    // Ждём, пока auth инициализируется
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
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.style.cursor = 'not-allowed';
            
            if (level === 'A2' || level === 'B1' || level === 'B2' || level === 'C1') {
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
                dailyStats: {},
                flags: { totalFlags: 0 },
                _previousFlags: { totalFlags: 0 }
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
        await window.loadUserProgressFromFirebase();
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
                dailyStats: {},
                flags: { totalFlags: 0 },
                _previousFlags: { totalFlags: 0 }
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
    location.reload();
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
        const isAdmin = user.email === 'ygubert72@gmail.com';
        
        // Админ-панель (только для администратора)
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? 'block' : 'none';
        }
        if (adminBtnMobile) {
            adminBtnMobile.style.display = isAdmin ? 'block' : 'none';
        }
        
        const premiumButtonHtml = (!isAdmin) ? `
            <div style="margin-top:8px;">
                ${!hasPremium 
                    ? `<button id="premiumPayBtn" style="width:100%; padding:8px; background:linear-gradient(135deg, #FFD700, #FFA500); color:#333; border:none; border-radius:16px; cursor:pointer; font-weight:bold; font-size:12px;">💎 ОПЛАТИТЬ ПРЕМИУМ</button>`
                    : `<div style="background:#4CAF50; border-radius:16px; padding:8px; text-align:center; color:white; font-weight:bold; font-size:12px;">✅ ПРЕМИУМ АКТИВЕН</div>`
                }
            </div>
        ` : '';
        
        const userInfoHtml = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:5px; flex-wrap:wrap;">
                    <span style="font-size:20px;">🎓</span>
                    <span style="word-break:break-all;">${user.email}</span>
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
            }, 100);
        }
        
    } else {
        loginBtn.style.display = 'block';
        if (loginBtnMobile) loginBtnMobile.style.display = 'block';
        
        userInfo.style.display = 'block';
        if (userInfoMobile) userInfoMobile.style.display = 'block';
        
        // Скрываем админ-кнопки
        if (adminBtn) adminBtn.style.display = 'none';
        if (adminBtnMobile) adminBtnMobile.style.display = 'none';
        
        const guestHtml = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="font-size:14px; font-weight:bold;">👋 Гостевой режим</div>
                <div style="font-size:11px; color:#666; margin-top:4px;">доступен только уровень A1</div>
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
    
    const PREMIUM_PRICE = 500;
    const CONTACTS = {
        telegram: "@SEO_2020",
        email: "ygubert72@gmail.com"
    };
    
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:
