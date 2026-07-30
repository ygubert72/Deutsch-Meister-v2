// logger.js — единая система логирования

const Logger = {
    // Уровни логирования
    levels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    },
    
    // Текущий уровень (в продакшене выставить INFO или WARN)
    currentLevel: 1, // INFO
    
    // Включить/выключить отправку на сервер
    sendToServerEnabled: true,
    
    // Основной метод логирования
    log(level, message, data = null) {
        if (level < this.currentLevel) return;
        
        const timestamp = new Date().toISOString();
        const levelName = Object.keys(this.levels).find(key => this.levels[key] === level) || 'INFO';
        const prefix = `[${timestamp}] [${levelName}]`;
        
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
        
        // Отправка на сервер (если включено и уровень >= INFO)
        if (this.sendToServerEnabled && level >= this.levels.INFO) {
            this._sendToServer(level, message, data);
        }
    },
    
    // Удобные методы-обёртки
    debug(message, data = null) {
        this.log(this.levels.DEBUG, message, data);
    },
    
    info(message, data = null) {
        this.log(this.levels.INFO, message, data);
    },
    
    warn(message, data = null) {
        this.log(this.levels.WARN, message, data);
    },
    
    error(message, data = null) {
        this.log(this.levels.ERROR, message, data);
    },
    
    // ===== ИСПРАВЛЕНО: Отправка на сервер (в Firebase) =====
    async _sendToServer(level, message, data) {
        try {
            // Проверяем, есть ли Firebase и пользователь
            if (typeof db === 'undefined' || !db) return;
            if (!auth || !auth.currentUser) return;
            
            // ===== ОЧИЩАЕМ data от объектов, которые Firebase не принимает =====
            let cleanData = null;
            if (data !== null && data !== undefined) {
                try {
                    // Пытаемся сериализовать в JSON и обратно, чтобы убрать циклические ссылки
                    cleanData = JSON.parse(JSON.stringify(data));
                } catch(e) {
                    // Если не получилось, сохраняем как строку
                    cleanData = { 
                        _error: 'Невозможно сериализовать данные',
                        _type: typeof data,
                        _string: String(data).substring(0, 200)
                    };
                }
            }
            
            await db.collection('logs').add({
                userId: auth.currentUser.uid,
                email: auth.currentUser.email,
                level: level,
                message: message,
                data: cleanData,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        } catch(e) {
            // Не используем Logger здесь, чтобы избежать бесконечного цикла
            console.error('Ошибка отправки лога:', e);
        }
    },
    
    // Установка уровня логирования
    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
        } else {
            this.currentLevel = level;
        }
    },
    
    // Включить/выключить отправку на сервер
    setSendToServer(enabled) {
        this.sendToServerEnabled = enabled;
    }
};

// Замена старых console.log на Logger (для совместимости)
// Старые вызовы console.log останутся, но новые будем писать через Logger

// Экспорт
window.Logger = Logger;
