// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initApp() {
    console.log('🚀 Запуск Deutsch-Meister...');
    
    // Снимаем выделение со всех кнопок уровней при загрузке
    document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('#levelsContainer .btn-level').forEach(btn => {
        btn.onclick = function() {
            const level = this.getAttribute('data-level');
            
            if (typeof window.hasAccessToLevel === 'function') {
                if (!window.hasAccessToLevel(level)) {
                    const user = window.getCurrentUser ? window.getCurrentUser() : null;
                    let message = '🔒 Этот уровень недоступен.';
                    if (!user) {
                        message += '\n\n👤 Войдите в аккаунт.';
                        if (level === 'B1' || level === 'B2' || level === 'C1') {
                            message += ' Для уровней B1-C1 также нужен премиум-доступ.';
                        }
                    } else if (level === 'A2') {
                        message += '\n\n🔐 Для уровня A2 нужна регистрация.';
                    } else if (level === 'B1' || level === 'B2' || level === 'C1') {
                        const userData = window.getCurrentUserData ? window.getCurrentUserData() : null;
                        if (!userData || !userData.hasPremiumAccess) {
                            message += '\n\n💎 Для уровня ' + level + ' требуется премиум-доступ. Нажмите "Оплатить премиум" в профиле.';
                        } else {
                            message += '\n\n⛔ Доступ запрещён.';
                        }
                    }
                    alert(message);
                    return;
                }
            }
            
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Также активируем в мобильном меню
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => {
                if (b.getAttribute('data-level') === level) {
                    b.classList.add('active');
                }
            });
            currentLevel = level;
            isWelcomePageVisible = false;
            loadLevel(currentLevel);
        };
    });
    
    document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(btn => {
        btn.onclick = function() {
            const level = this.getAttribute('data-level');
            
            if (typeof window.hasAccessToLevel === 'function') {
                if (!window.hasAccessToLevel(level)) {
                    const user = window.getCurrentUser ? window.getCurrentUser() : null;
                    let message = '🔒 Этот уровень недоступен.';
                    if (!user) {
                        message += '\n\n👤 Войдите в аккаунт.';
                        if (level === 'B1' || level === 'B2' || level === 'C1') {
                            message += ' Для уровней B1-C1 также нужен премиум-доступ.';
                        }
                    } else if (level === 'A2') {
                        message += '\n\n🔐 Для уровня A2 нужна регистрация.';
                    } else if (level === 'B1' || level === 'B2' || level === 'C1') {
                        const userData = window.getCurrentUserData ? window.getCurrentUserData() : null;
                        if (!userData || !userData.hasPremiumAccess) {
                            message += '\n\n💎 Для уровня ' + level + ' требуется премиум-доступ. Нажмите "Оплатить премиум" в профиле.';
                        } else {
                            message += '\n\n⛔ Доступ запрещён.';
                        }
                    }
                    alert(message);
                    return;
                }
            }
            
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => {
                if (b.getAttribute('data-level') === level) {
                    b.classList.add('active');
                }
            });
            currentLevel = level;
            isWelcomePageVisible = false;
            loadLevel(currentLevel);
        };
    });
    
    const savedState = typeof window.loadState === 'function' ? window.loadState() : null;
    
    if (savedState && savedState.level && savedState.lessonId !== null && savedState.lessonId !== undefined) {
        // Проверяем доступ к сохранённому уровню
        if (typeof window.hasAccessToLevel === 'function' && !window.hasAccessToLevel(savedState.level)) {
            console.log('⚠️ Сохранённый уровень недоступен, показываем приветственную');
            if (typeof window.showWelcomePage === 'function') {
                window.showWelcomePage();
            }
            return;
        }
        
        setTimeout(() => {
            if (courseData && courseData.lessons) {
                const lessonExists = courseData.lessons.some(l => l.id === savedState.lessonId);
                if (lessonExists && window.hasAccessToLevel(savedState.level)) {
                    console.log('🔄 Восстановление сохранённого урока:', savedState.lessonId);
                    currentLevel = savedState.level;
                    isWelcomePageVisible = false;
                    if (savedState.mode) {
                        window.currentMode = savedState.mode;
                    }
                    // Активируем кнопку уровня
                    document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
                        if (btn.getAttribute('data-level') === savedState.level) {
                            btn.classList.add('active');
                        }
                    });
                    loadLesson(savedState.lessonId);
                    return;
                }
            }
            if (typeof window.showWelcomePage === 'function') {
                window.showWelcomePage();
            }
        }, 300);
    } else {
        if (typeof window.showWelcomePage === 'function') {
            window.showWelcomePage();
        }
    }
    
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 200);
    }
    
    setTimeout(updateCounter, 1000);
    setTimeout(updateCounter, 2000);
    
    console.log('✅ Deutsch-Meister готов!');
}
