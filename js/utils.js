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

// ========== ПЕРЕМЕШИВАНИЕ МАССИВА ==========
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ========== ПОЛУЧЕНИЕ ВСЕХ УРОКОВ УРОВНЯ ==========
function getAllLessonsForLevel(level) {
    // Проверяем, загружены ли данные курса
    if (!window.courseData || !window.courseData.lessons) {
        console.warn(`⚠️ Данные для уровня ${level} еще не загружены.`);
        return [];
    }
    return window.courseData.lessons || [];
}

// ========== ПОЛУЧЕНИЕ ВСЕХ СЛОВ УРОВНЯ ==========
async function getAllWordsForLevel(level) {
    const allWords = [];
    const lessons = getAllLessonsForLevel(level);
    
    if (!lessons || lessons.length === 0) {
        console.warn('⚠️ Нет уроков для уровня', level);
        return [];
    }
    
    console.log(`📚 Сбор всех слов для уровня ${level}, уроков: ${lessons.length}`);
    
    // Проходим ТОЛЬКО по реальным урокам из courseData
    for (const lesson of lessons) {
        try {
            const lessonId = lesson.id;
            const grammarFile = `docs/${level}/grammar/${String(lessonId).padStart(2, '0')}_grammar.json`;
            const response = await fetch(grammarFile);
            if (response.ok) {
                const data = await response.json();
                if (data.vocabulary && Array.isArray(data.vocabulary)) {
                    allWords.push(...data.vocabulary);
                    console.log(`  ✅ Урок ${lessonId}: загружено ${data.vocabulary.length} слов`);
                }
            } else {
                console.warn(`  ⚠️ Урок ${lessonId}: файл не найден (${grammarFile})`);
            }
        } catch(e) {
            console.warn(`  ⚠️ Ошибка загрузки урока ${lesson.id}:`, e.message);
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

// ========== ПОЛУЧЕНИЕ ВСЕХ ФРАЗ УРОВНЯ ==========
async function getAllPhrasesForLevel(level) {
    const allPhrases = [];
    const lessons = getAllLessonsForLevel(level);
    
    if (!lessons || lessons.length === 0) {
        console.warn('⚠️ Нет уроков для уровня', level);
        return [];
    }
    
    console.log(`📚 Сбор всех фраз для уровня ${level}, уроков: ${lessons.length}`);
    
    // Проходим ТОЛЬКО по реальным урокам из courseData
    for (const lesson of lessons) {
        try {
            const lessonId = lesson.id;
            const lessonFile = `docs/${level}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            const response = await fetch(lessonFile);
            if (response.ok) {
                const data = await response.json();
                if (data.trainer && Array.isArray(data.trainer)) {
                    allPhrases.push(...data.trainer);
                    console.log(`  ✅ Урок ${lessonId}: загружено ${data.trainer.length} фраз`);
                }
            } else {
                console.warn(`  ⚠️ Урок ${lessonId}: файл не найден (${lessonFile})`);
            }
        } catch(e) {
            console.warn(`  ⚠️ Ошибка загрузки урока ${lesson.id}:`, e.message);
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
