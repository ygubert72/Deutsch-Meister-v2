// ====================================================================
// speak.js — Озвучка текста на немецком языке
// ====================================================================

let cachedGermanVoice = null;
let voicesLoaded = false;

// ========== ПОЛУЧЕНИЕ ЛУЧШЕГО НЕМЕЦКОГО ГОЛОСА ==========
function getGermanVoice() {
    if (cachedGermanVoice) return cachedGermanVoice;
    
    const voices = window.speechSynthesis.getVoices();
    
    // Ищем все немецкие голоса
    const germanVoices = voices.filter(v => v.lang === 'de-DE' || v.lang === 'de');
    
    if (germanVoices.length === 0) {
        console.log('🔊 Немецкие голоса не найдены');
        return null;
    }
    
    // Приоритет: Google, Microsoft, затем остальные
    const priorityOrder = ['Google', 'Microsoft', 'Samantha', 'Anna', 'Yannick'];
    
    for (const name of priorityOrder) {
        const found = germanVoices.find(v => v.name.includes(name));
        if (found) {
            cachedGermanVoice = found;
            console.log('🎤 Выбран голос:', found.name);
            return found;
        }
    }
    
    // Если ничего не нашли — берём первый доступный
    cachedGermanVoice = germanVoices[0];
    console.log('🎤 Выбран голос (запасной):', cachedGermanVoice.name);
    return cachedGermanVoice;
}

// ========== ПРЕДЗАГРУЗКА ГОЛОСОВ ==========
function preloadVoices() {
    if (voicesLoaded || !window.speechSynthesis) return;
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        voicesLoaded = true;
        getGermanVoice();
        console.log('🎤 Голоса загружены, доступно:', voices.length);
    } else {
        window.speechSynthesis.onvoiceschanged = function() {
            voicesLoaded = true;
            getGermanVoice();
            console.log('🎤 Голоса загружены (onvoiceschanged), доступно:', window.speechSynthesis.getVoices().length);
        };
    }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ОЗВУЧКИ ==========
function speak(text) {
    if (!text || !window.speechSynthesis) {
        console.warn('🔇 Нет текста или speechSynthesis не поддерживается');
        return;
    }
    
    // Очищаем текст, сохраняя немецкие буквы
    const clean = text.replace(/[^\w\s\-äöüßÄÖÜ,?!.]/g, '');
    if (!clean.trim()) {
        console.warn('🔇 Текст пуст после очистки');
        return;
    }
    
    try {
        // Отменяем предыдущую речь
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85;      // Чуть медленнее для чёткости
        utterance.pitch = 1.0;       // Нормальная высота
        utterance.volume = 1.0;      // Максимальная громкость
        
        // Пытаемся найти хороший немецкий голос
        const voice = getGermanVoice();
        if (voice) {
            utterance.voice = voice;
        }
        
        // Обработчики для отладки
        utterance.onstart = function() {
            console.log('🔊 Озвучка:', clean.substring(0, 40) + (clean.length > 40 ? '...' : ''));
        };
        
        utterance.onerror = function(e) {
            console.warn('🔊 Ошибка озвучки:', e);
        };
        
        window.speechSynthesis.speak(utterance);
        
    } catch(e) {
        console.error('🔊 Критическая ошибка озвучки:', e);
    }
}

// ========== ПРОВЕРКА ДОСТУПНЫХ ГОЛОСОВ (ДЛЯ ОТЛАДКИ) ==========
function checkVoices() {
    if (!window.speechSynthesis) {
        console.log('❌ speechSynthesis не поддерживается');
        return;
    }
    const voices = window.speechSynthesis.getVoices();
    console.log('🎤 Доступно голосов:', voices.length);
    voices.forEach(v => {
        if (v.lang.startsWith('de')) {
            console.log('  🟢', v.name, v.lang);
        }
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Предзагружаем голоса
if (typeof window !== 'undefined') {
    // Сразу пробуем
    setTimeout(preloadVoices, 100);
    // И через секунду на всякий случай
    setTimeout(preloadVoices, 1000);
    // И через 3 секунды
    setTimeout(preloadVoices, 3000);
}

// Экспортируем функции
window.speak = speak;
window.checkVoices = checkVoices;

console.log('🔊 speak.js загружен');
