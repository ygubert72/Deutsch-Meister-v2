// ============================================================
// config.js — Глобальные настройки приложения
// ============================================================

// ===== НОВОЕ: ВЕРСИЯ КОНТЕНТА (менять при обновлении уроков/инструкции) =====
const CONTENT_VERSION = '2.0.13';

// Глобальные настройки
const AppConfig = {
    currentLevel: 'A1',
    show_language: 'de',
    quiz_direction: 'de_to_ru',
    sentence_lang_from: 'ru'
};

// Глобальные состояния
let currentMode = 'grammar';

// SVG НЕМЕЦКОГО ФЛАГА
const GERMAN_FLAG_SVG = `
<svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="13.33" fill="#000000"/>
    <rect y="13.33" width="60" height="13.33" fill="#DD0000"/>
    <rect y="26.66" width="60" height="13.34" fill="#FFCC00"/>
</svg>
`;

// БД
let wordsDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let sentencesDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };

// Прогресс
let wordsProgress = {};
let sentencesProgress = {};
let grammarProgress = { A1: [], A2: [], B1: [], B2: [], C1: [] };

// ===== НОВОЕ: Ключи для хранения в localStorage =====
const STORAGE_KEYS = {
    WORDS: 'dm_words_progress',
    SENTENCES: 'dm_sentences_progress',
    GRAMMAR: 'dm_grammar_progress',
    CONFIG: 'dm_config',
    CONTAINER_PREFIX: 'dm_container_' // для контейнеров уроков
};

// ===== НОВОЕ: Ключи для кеша фраз и слов =====
const PHRASES_CACHE_KEY = 'dm_phrases_cache';
const WORDS_CACHE_KEY = 'dm_words_cache';

// ===== НОВОЕ: Получить путь к подколлекции прогресса урока =====
function getProgressPath(userId, level, lessonId) {
    return `users/${userId}/progress/${level}_lesson_${lessonId}`;
}

// ===== НОВОЕ: Получить путь к подколлекции статистики =====
function getStatsPath(userId, date) {
    return `users/${userId}/stats/${date}`;
}

// ===== НОВОЕ: Получить ключ контейнера для урока =====
function getContainerKey(level, lessonId) {
    return `${STORAGE_KEYS.CONTAINER_PREFIX}${level}_lesson_${lessonId}`;
}

function saveProgress() {
    localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(wordsProgress));
    localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentencesProgress));
    localStorage.setItem(STORAGE_KEYS.GRAMMAR, JSON.stringify(grammarProgress));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({
        last_level: AppConfig.currentLevel,
        show_language: AppConfig.show_language,
        quiz_direction: AppConfig.quiz_direction,
        sentence_lang_from: AppConfig.sentence_lang_from,
        last_mode: window.currentMode || 'grammar'   // ← ИСПОЛЬЗУЕМ ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ!
    }));
    
    if (window.saveUserProgressToFirebase) {
        window.saveUserProgressToFirebase();
    }
}

// ===== В config.js найти и заменить функцию loadProgress() =====
function loadProgress() {
    try {
        const wp = localStorage.getItem(STORAGE_KEYS.WORDS);
        if (wp) wordsProgress = JSON.parse(wp);
        const sp = localStorage.getItem(STORAGE_KEYS.SENTENCES);
        if (sp) sentencesProgress = JSON.parse(sp);
        const gp = localStorage.getItem(STORAGE_KEYS.GRAMMAR);
        if (gp) grammarProgress = JSON.parse(gp);
        const cfg = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (cfg) {
            const parsed = JSON.parse(cfg);
            AppConfig.currentLevel = parsed.last_level || 'A1';
            AppConfig.show_language = parsed.show_language || 'de';
            AppConfig.quiz_direction = parsed.quiz_direction || 'de_to_ru';
            AppConfig.sentence_lang_from = parsed.sentence_lang_from || 'ru';
            // ===== ИЗМЕНЕНО: НЕ перезаписываем currentMode! =====
            // Сохраняем last_mode в специальную переменную для app.js
            window._savedMode = parsed.last_mode || 'grammar';
            // Убираем эту строку (она была причиной проблемы):
            // currentMode = parsed.last_mode || 'grammar';
        }
    } catch(e) {}
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        if (!wordsProgress[lvl]) wordsProgress[lvl] = [];
        if (!sentencesProgress[lvl]) sentencesProgress[lvl] = [];
        if (!grammarProgress[lvl]) grammarProgress[lvl] = [];
    });
}

// ===== НОВОЕ: Функция для получения версии контента =====
function getContentVersion() {
    return CONTENT_VERSION;
}

// Экспорт в window
window.AppConfig = AppConfig;
window.currentMode = currentMode;
window.GERMAN_FLAG_SVG = GERMAN_FLAG_SVG;
window.wordsDB = wordsDB;
window.sentencesDB = sentencesDB;
window.wordsProgress = wordsProgress;
window.sentencesProgress = sentencesProgress;
window.grammarProgress = grammarProgress;
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;

// ===== НОВОЕ: Экспорт новых функций и констант =====
window.getProgressPath = getProgressPath;
window.getStatsPath = getStatsPath;
window.getContainerKey = getContainerKey;
window.STORAGE_KEYS = STORAGE_KEYS;
window.PHRASES_CACHE_KEY = PHRASES_CACHE_KEY;
window.WORDS_CACHE_KEY = WORDS_CACHE_KEY;
window.getContentVersion = getContentVersion;
window.CONTENT_VERSION = CONTENT_VERSION;

console.log('✅ config.js загружен (версия контента:', CONTENT_VERSION + ')');
