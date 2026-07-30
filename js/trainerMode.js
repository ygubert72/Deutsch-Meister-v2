// activityTracker.js — логирование активности пользователя и анализ флагов

// ========== ПОЛУЧЕНИЕ IP И ГОРОДА (ИСПРАВЛЕНО) ==========
async function getUserLocation() {
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ip = ipData.ip || 'unknown';
        
        if (ip === 'unknown') {
            return { ip: 'unknown', city: 'unknown', country: 'unknown', region: 'unknown' };
        }
        
        // ===== ИСПРАВЛЕНО: используем только ip-api.com с HTTPS =====
        try {
            const backupResponse = await fetch(`https://ip-api.com/json/${ip}?fields=status,message,country,city,regionName`);
            if (backupResponse.ok) {
                const backupData = await backupResponse.json();
                if (backupData.status === 'success') {
                    return {
                        ip: ip,
                        city: backupData.city || 'unknown',
                        country: backupData.country || 'unknown',
                        region: backupData.regionName || 'unknown'
                    };
                }
            }
        } catch (e) {
            // Если не удалось получить город — просто возвращаем IP
            console.log('⚠️ Не удалось получить геолокацию, используем только IP');
        }
        
        return { ip: ip, city: 'unknown', country: 'unknown', region: 'unknown' };
        
    } catch(e) {
        console.error('❌ Ошибка определения геолокации:', e);
        return { ip: 'unknown', city: 'unknown', country: 'unknown', region: 'unknown' };
    }
}

// ========== ID УСТРОЙСТВА ==========
function getDeviceId() {
    let id = navigator.userAgent + navigator.platform + window.screen.width + window.screen.height;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ========== ПРОВЕРКА МОБИЛЬНОГО УСТРОЙСТВА ==========
function isMobileDevice() {
    const mobilePlatforms = ['iPhone', 'iPad', 'iPod', 'Android', 'BlackBerry', 'Windows Phone'];
    return mobilePlatforms.some(p => navigator.platform.includes(p));
}

// ========== АНАЛИЗ ФЛАГОВ ПОДОЗРИТЕЛЬНОСТИ ==========
function analyzeFlags(userData, today) {
    const flags = {
        multipleDevices: false,
        differentCities: false,
        highActivity: false,
        manyIPs: false,
        unnaturalHours: false,
        totalFlags: 0
    };
    
    if (userData.devices && userData.devices.length > 2) {
        flags.multipleDevices = true;
        flags.totalFlags++;
    }
    
    let stats = userData.dailyStats?.[today];
    if (!stats) {
        stats = userData._stats?.[today];
    }
    
    if (stats && stats.uniqueCities && stats.uniqueCities.length > 2) {
        flags.differentCities = true;
        flags.totalFlags++;
    }
    
    if (stats && stats.totalMinutes > 180) {
        flags.highActivity = true;
        flags.totalFlags++;
    }
    
    if (stats && stats.uniqueIPs && stats.uniqueIPs.length > 3) {
        flags.manyIPs = true;
        flags.totalFlags++;
    }
    
    if (stats && stats.firstActivity && stats.lastActivity) {
        const firstHour = new Date(stats.firstActivity).getHours();
        const lastHour = new Date(stats.lastActivity).getHours();
        if ((firstHour >= 0 && firstHour <= 6) && (lastHour >= 8 && lastHour <= 12)) {
            flags.unnaturalHours = true;
            flags.totalFlags++;
        }
        if ((firstHour >= 8 && firstHour <= 12) && (lastHour >= 20 && lastHour <= 23)) {
            flags.unnaturalHours = true;
            flags.totalFlags++;
        }
    }
    
    return flags;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ЛОГИРОВАНИЯ АКТИВНОСТИ ==========
async function logUserActivity(user) {
    if (!user || !db) return;
    
    if (user.email === ADMIN_EMAIL) {
        Logger.debug('Админ не отслеживается');
        return;
    }
    
    const uid = user.uid;
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const location = await getUserLocation();
        const deviceId = getDeviceId();
        const deviceType = isMobileDevice() ? 'mobile' : 'desktop';
        
        const userDoc = await db.collection('users').doc(uid).get();
        let data = userDoc.exists ? userDoc.data() : {};
        
        if (!data.devices) data.devices = [];
        const existingDevice = data.devices.find(d => d.id === deviceId);
        
        if (!existingDevice) {
            data.devices.push({
                id: deviceId,
                type: deviceType,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ip: location.ip,
                city: location.city,
                country: location.country
            });
        } else {
            existingDevice.lastSeen = new Date().toISOString();
            existingDevice.ip = location.ip;
            existingDevice.city = location.city;
            existingDevice.country = location.country;
        }
        
        const statsRef = db.collection('users').doc(uid).collection('stats').doc(today);
        const statsDoc = await statsRef.get();
        
        let stats = statsDoc.exists ? statsDoc.data() : {
            sessions: 0,
            totalMinutes: 0,
            uniqueIPs: [],
            uniqueCities: [],
            wordsLearned: 0,
            firstActivity: null,
            lastActivity: null
        };
        
        stats.sessions += 1;
        
        if (!stats.uniqueIPs.includes(location.ip) && location.ip !== 'unknown') {
            stats.uniqueIPs.push(location.ip);
        }
        if (!stats.uniqueCities.includes(location.city) && location.city !== 'unknown') {
            stats.uniqueCities.push(location.city);
        }
        if (!stats.firstActivity) {
            stats.firstActivity = new Date().toISOString();
        }
        stats.lastActivity = new Date().toISOString();
        
        await statsRef.set(stats, { merge: true });
        
        if (!data._stats) data._stats = {};
        data._stats[today] = {
            sessions: stats.sessions,
            totalMinutes: stats.totalMinutes,
            uniqueIPs: stats.uniqueIPs,
            uniqueCities: stats.uniqueCities,
            firstActivity: stats.firstActivity,
            lastActivity: stats.lastActivity
        };
        
        if (!data.dailyStats) data.dailyStats = {};
        data.dailyStats[today] = {
            sessions: stats.sessions,
            totalMinutes: stats.totalMinutes,
            uniqueIPs: stats.uniqueIPs,
            uniqueCities: stats.uniqueCities,
            wordsLearned: stats.wordsLearned || 0,
            firstActivity: stats.firstActivity,
            lastActivity: stats.lastActivity
        };
        
        const flags = analyzeFlags(data, today);
        data.flags = flags;
        
        const oldFlags = data._previousFlags || { totalFlags: 0 };
        if (flags.totalFlags > oldFlags.totalFlags) {
            await db.collection('admin_logs').add({
                userId: uid,
                email: user.email,
                timestamp: new Date().toISOString(),
                event: 'flags_increased',
                flagsBefore: oldFlags.totalFlags,
                flagsAfter: flags.totalFlags,
                flags: flags,
                details: {
                    deviceId: deviceId,
                    deviceType: deviceType,
                    ip: location.ip,
                    city: location.city,
                    country: location.country
                }
            });
        }
        data._previousFlags = flags;
        
        if (flags.totalFlags >= 3) {
            data.status = 'warning';
        } else if (flags.totalFlags >= 2) {
            data.status = 'monitor';
        } else {
            data.status = 'ok';
        }
        
        await db.collection('users').doc(uid).set(data, { merge: true });
        
        Logger.debug('Активность пользователя залогирована, флагов:', flags.totalFlags);
        Logger.debug('Статистика сохранена в подколлекцию stats');
        
    } catch (e) {
        Logger.error('Ошибка логирования активности:', e);
    }
}

// ========== ЛОГИРОВАНИЕ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЯ ==========
async function logUserAction(action, details = {}) {
    try {
        if (typeof window.isAuthenticated === 'undefined' || !window.isAuthenticated()) {
            return;
        }
        
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) return;
        
        await db.collection('user_actions').add({
            userId: user.uid,
            email: user.email,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            deviceId: getDeviceId()
        });
        
        Logger.debug('Действие залогировано:', action, details);
    } catch(e) {
        Logger.error('Ошибка логирования действия:', e);
    }
}

// ========== СОХРАНЕНИЕ ПРОГРЕССА В ОБЛАКО ==========
async function saveProgressToFirebase() {
    if (!auth || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    if (!db) return;
    
    try {
        for (const [level, words] of Object.entries(wordsProgress)) {
            if (words && words.length > 0) {
                const progressRef = db.collection('users').doc(userId)
                    .collection('progress').doc(`${level}_all_words`);
                await progressRef.set({
                    words: words,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            }
        }
        
        for (const [level, sentences] of Object.entries(sentencesProgress)) {
            if (sentences && sentences.length > 0) {
                const progressRef = db.collection('users').doc(userId)
                    .collection('progress').doc(`${level}_all_sentences`);
                await progressRef.set({
                    sentences: sentences,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            }
        }
        
        for (const [level, grammar] of Object.entries(grammarProgress)) {
            if (grammar && grammar.length > 0) {
                const progressRef = db.collection('users').doc(userId)
                    .collection('progress').doc(`${level}_grammar`);
                await progressRef.set({
                    lessons: grammar,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            }
        }
        
        const configRef = db.collection('users').doc(userId)
            .collection('progress').doc('config');
        await configRef.set({
            last_level: AppConfig.currentLevel,
            show_language: AppConfig.show_language,
            quiz_direction: AppConfig.quiz_direction,
            sentence_lang_from: AppConfig.sentence_lang_from,
            last_mode: currentMode,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        Logger.debug('Прогресс сохранён в облаке (новая структура)');
    } catch(e) {
        Logger.error('Ошибка сохранения прогресса:', e);
    }
}

// ========== ЗАГРУЗКА ПРОГРЕССА ИЗ ОБЛАКА ==========
async function loadProgressFromFirebase() {
    if (!auth || !auth.currentUser) return false;
    const userId = auth.currentUser.uid;
    if (!db) return false;
    
    try {
        const progressSnapshot = await db.collection('users').doc(userId)
            .collection('progress').get();
        
        let loaded = false;
        
        progressSnapshot.forEach(doc => {
            const data = doc.data();
            const docId = doc.id;
            
            if (docId === 'config') {
                if (data) {
                    AppConfig.currentLevel = data.last_level || 'A1';
                    AppConfig.show_language = data.show_language || 'de';
                    AppConfig.quiz_direction = data.quiz_direction || 'de_to_ru';
                    AppConfig.sentence_lang_from = data.sentence_lang_from || 'ru';
                    currentMode = data.last_mode || 'grammar';
                    localStorage.setItem('dm_config', JSON.stringify(data));
                }
                loaded = true;
            } else if (docId.endsWith('_all_words')) {
                const level = docId.replace('_all_words', '');
                if (data.words) {
                    wordsProgress[level] = data.words;
                    localStorage.setItem('dm_words_progress', JSON.stringify(wordsProgress));
                }
                loaded = true;
            } else if (docId.endsWith('_all_sentences')) {
                const level = docId.replace('_all_sentences', '');
                if (data.sentences) {
                    sentencesProgress[level] = data.sentences;
                    localStorage.setItem('dm_sentences_progress', JSON.stringify(sentencesProgress));
                }
                loaded = true;
            } else if (docId.endsWith('_grammar')) {
                const level = docId.replace('_grammar', '');
                if (data.lessons) {
                    grammarProgress[level] = data.lessons;
                    localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
                }
                loaded = true;
            }
        });
        
        if (loaded) {
            Logger.info('Прогресс загружен из облака (новая структура)');
            return true;
        }
        
        return await loadProgressFromFirebaseOld();
        
    } catch(e) {
        Logger.error('Ошибка загрузки прогресса:', e);
        return await loadProgressFromFirebaseOld();
    }
}

// ===== ОБРАТНАЯ СОВМЕСТИМОСТЬ =====
async function loadProgressFromFirebaseOld() {
    if (!auth || !auth.currentUser) return false;
    const userId = auth.currentUser.uid;
    if (!db) return false;
    
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().progress) {
            const progress = userDoc.data().progress;
            
            if (progress.wordsProgress) {
                Object.assign(wordsProgress, progress.wordsProgress);
                localStorage.setItem('dm_words_progress', JSON.stringify(wordsProgress));
            }
            if (progress.sentencesProgress) {
                Object.assign(sentencesProgress, progress.sentencesProgress);
                localStorage.setItem('dm_sentences_progress', JSON.stringify(sentencesProgress));
            }
            if (progress.grammarProgress) {
                Object.assign(grammarProgress, progress.grammarProgress);
                localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
            }
            if (progress.config) {
                const config = progress.config;
                localStorage.setItem('dm_config', JSON.stringify(config));
                AppConfig.show_language = config.show_language || 'de';
                AppConfig.quiz_direction = config.quiz_direction || 'de_to_ru';
                AppConfig.sentence_lang_from = config.sentence_lang_from || 'ru';
                currentMode = config.last_mode || 'grammar';
            }
            
            Logger.info('Прогресс загружен из старой структуры (обратная совместимость)');
            return true;
        }
    } catch(e) {
        Logger.error('Ошибка загрузки из старой структуры:', e);
    }
    return false;
}

// Экспорт
window.ActivityTracker = {
    logUserActivity,
    logUserAction,
    saveProgressToFirebase,
    loadProgressFromFirebase,
    getUserLocation,
    getDeviceId,
    analyzeFlags
};

// Сохраняем старые имена для обратной совместимости
window.saveUserProgressToFirebase = saveProgressToFirebase;
window.loadUserProgressFromFirebase = loadProgressFromFirebase;

console.log('✅ activityTracker.js загружен (исправлена геолокация)');
