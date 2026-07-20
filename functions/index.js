// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ============================================================
// ФУНКЦИЯ: Назначение прав администратора
// Вызывается вручную или автоматически при регистрации
// ============================================================

/**
 * Эта функция проверяет email пользователя и назначает ему роль admin,
 * если email совпадает с вашим адресом.
 * 
 * ВАЖНО: Вызовите эту функцию один раз для своего аккаунта!
 */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
    // Проверяем, что запрос делает администратор
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
    }
    
    // Получаем email пользователя, которому хотим дать права
    const targetEmail = data.email;
    
    if (!targetEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'Email обязателен');
    }
    
    // Проверяем, что текущий пользователь — это вы (защита от взлома)
    const callerUid = context.auth.uid;
    const callerSnapshot = await admin.auth().getUser(callerUid);
    const adminEmail = 'ygubert72@gmail.com'; // ВАШ EMAIL
    
    if (callerSnapshot.email !== adminEmail) {
        throw new functions.https.HttpsError('permission-denied', 'Только администратор может назначать права');
    }
    
    try {
        // Находим пользователя по email
        const user = await admin.auth().getUserByEmail(targetEmail);
        
        // Устанавливаем кастомное утверждение (claim)
        await admin.auth().setCustomUserClaims(user.uid, {
            admin: true,
            role: 'admin'
        });
        
        return {
            success: true,
            message: `Пользователь ${targetEmail} теперь администратор`
        };
    } catch (error) {
        console.error('Ошибка назначения прав:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================================
// ФУНКЦИЯ: Проверка статуса администратора
// Используется на клиенте для отображения админ-панели
// ============================================================

exports.checkAdminStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        return { isAdmin: false };
    }
    
    try {
        const user = await admin.auth().getUser(context.auth.uid);
        const isAdmin = user.customClaims?.admin === true;
        return { isAdmin };
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
        return { isAdmin: false };
    }
});

// ============================================================
// АВТОМАТИЧЕСКОЕ НАЗНАЧЕНИЕ ПРИ РЕГИСТРАЦИИ (опционально)
// ============================================================

exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    const adminEmail = 'ygubert72@gmail.com'; // ВАШ EMAIL
    
    // Если регистрируется администратор — даём права сразу
    if (email === adminEmail) {
        try {
            await admin.auth().setCustomUserClaims(user.uid, {
                admin: true,
                role: 'admin'
            });
            console.log(`✅ Автоматически назначены права админа для: ${email}`);
        } catch (error) {
            console.error('Ошибка назначения прав:', error);
        }
    }
});
