// utils.js — общие утилиты для всего приложения

// ========== ОПРЕДЕЛЕНИЕ УСТРОЙСТВА ==========
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// ========== ID УСТРОЙСТВА (единая версия) ==========
function getDeviceId() {
    var id = navigator.userAgent + navigator.platform + window.screen.width + window.screen.height;
    var hash = 0;
    for (var i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ========== ДЕБАУНС ДЛЯ RESIZE ==========
function debounce(func, wait) {
    var timeout;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// ========== БЕЗОПАСНОЕ ОТОБРАЖЕНИЕ ТЕКСТА ==========
function safeText(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ========== ОЧИСТКА ТАЙМЕРОВ ==========
function clearTimer(timer) {
    if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
        return null;
    }
    return null;
}

// ========== ПРОВЕРКА, ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ АДМИНОМ ==========
function isAdminUser(user) {
    if (!user) return false;
    return user.email === 'ygubert72@gmail.com';
}

// ========== НОВАЯ ФУНКЦИЯ: ПЕРЕМЕШИВАНИЕ МАССИВА ==========
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ========== НОВАЯ ФУНКЦИЯ: ПОЛУЧЕНИЕ ВСЕХ УРОКОВ УРОВНЯ ==========
async function getAllLessonsForLevel(level) {
    if (!window.courseData) {
        console.error('❌ courseData не загружен');
        return [];
    }
    return window.courseData.lessons || [];
}

// ========== НОВАЯ ФУНКЦИЯ: ПОЛУЧЕНИЕ ВСЕХ СЛОВ УРОВНЯ ==========
async function getAllWordsForLevel(level) {
    const allWords = [];
    const lessons = await getAllLessonsForLevel(level);
    
    console.log(`📚 Сбор всех слов для уровня ${level}, уроков: ${lessons.length}`);
    
    for (const lesson of lessons) {
        try {
            const grammarFile = `docs/${level}/grammar/${String(lesson.id).padStart(2, '0')}_grammar.json`;
            const response = await fetch(grammarFile);
            if (response.ok) {
                const data = await response.json();
                if (data.vocabulary && Array.isArray(data.vocabulary)) {
                    allWords.push(...data.vocabulary);
                }
            }
        } catch(e) {
            console.warn(`⚠️ Не удалось загрузить слова для урока ${lesson.id}:`, e.message);
        }
    }
    
    // Убираем дубликаты по полю 'de'
    const unique = [];
    const seen = new Set();
    for (const word of allWords) {
        if (word.de && !seen.has(word.de)) {
            seen.add(word.de);
            unique.push({ ...word });
        }
    }
    
    console.log(`✅ Собрано слов: ${unique.length} (из ${allWords.length} с дубликатами)`);
    return unique;
}

// ========== НОВАЯ ФУНКЦИЯ: ПОЛУЧЕНИЕ ВСЕХ ФРАЗ УРОВНЯ ==========
async function getAllPhrasesForLevel(level) {
    const allPhrases = [];
    const lessons = await getAllLessonsForLevel(level);
    
    console.log(`📚 Сбор всех фраз для уровня ${level}, уроков: ${lessons.length}`);
    
    for (const lesson of lessons) {
        try {
            const lessonFile = `docs/${level}/lessons/lesson_${String(lesson.id).padStart(2, '0')}.json`;
            const response = await fetch(lessonFile);
            if (response.ok) {
                const data = await response.json();
                if (data.trainer && Array.isArray(data.trainer)) {
                    allPhrases.push(...data.trainer);
                }
            }
        } catch(e) {
            console.warn(`⚠️ Не удалось загрузить фразы для урока ${lesson.id}:`, e.message);
        }
    }
    
    // Убираем дубликаты по полю 'de'
    const unique = [];
    const seen = new Set();
    for (const phrase of allPhrases) {
        if (phrase.de && !seen.has(phrase.de)) {
            seen.add(phrase.de);
            unique.push({ ...phrase });
        }
    }
    
    console.log(`✅ Собрано фраз: ${unique.length} (из ${allPhrases.length} с дубликатами)`);
    return unique;
}

// ========== ЭКСПОРТ ==========
window.utils = {
    isMobileDevice: isMobileDevice,
    getDeviceId: getDeviceId,
    debounce: debounce,
    safeText: safeText,
    clearTimer: clearTimer,
    isAdminUser: isAdminUser,
    shuffleArray: shuffleArray,
    getAllLessonsForLevel: getAllLessonsForLevel,
    getAllWordsForLevel: getAllWordsForLevel,
    getAllPhrasesForLevel: getAllPhrasesForLevel
};

// Глобальный экспорт для удобства
window.shuffleArray = shuffleArray;
window.getAllWordsForLevel = getAllWordsForLevel;
window.getAllPhrasesForLevel = getAllPhrasesForLevel;

console.log('🔧 utils.js загружен');
