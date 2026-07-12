// ============================================================
// storage.js — Сохранение и загрузка состояния приложения
// ============================================================

function saveState() {
    try {
        const state = {
            level: window.currentLevel || 'A1',
            lessonId: window.currentLesson?.id || null,
            mode: window.currentMode || 'grammar'
        };
        localStorage.setItem('dm_app_state', JSON.stringify(state));
        console.log('💾 Состояние сохранено:', state);
    } catch(e) {
        console.log('Ошибка сохранения состояния:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('dm_app_state');
        if (saved) {
            const state = JSON.parse(saved);
            console.log('📂 Состояние загружено из localStorage:', state);
            return state;
        }
    } catch(e) {
        console.log('Ошибка загрузки состояния:', e);
    }
    return null;
}

// Экспорт
window.saveState = saveState;
window.loadState = loadState;

console.log('💾 storage.js загружен');
