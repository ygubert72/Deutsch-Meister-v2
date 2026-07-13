// ====================================================================
// speak.js — Озвучка текста на немецком языке
// ====================================================================

let cachedGermanVoice = null;
let voicesLoaded = false;

// ========== ПОЛУЧЕНИЕ ЛУЧШЕГО НЕМЕЦКОГО ГОЛОСА ==========
function getGermanVoice() {
    if (cachedGermanVoice) return cachedGermanVoice;
    
    const voices = window.speechSynthesis.getVoices();
    
    const germanVoices = voices.filter(v => v.lang === 'de-DE' || v.lang === 'de');
    
    if (germanVoices.length === 0) {
        console.log('🔊 Немецкие голоса не найдены');
        return null;
    }
    
    const priorityOrder = ['Google', 'Microsoft', 'Samantha', 'Anna', 'Yannick'];
    
    for (const name of priorityOrder) {
        const found = germanVoices.find(v => v.name.includes(name));
        if (found) {
            cachedGermanVoice = found;
            console.log('🎤 Выбран голос:', found.name);
            return found;
        }
    }
    
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

// ========== ОСНОВНАЯ ОЗВУЧКА ==========
function speak(text) {
    if (!text || !window.speechSynthesis) {
        console.warn('🔇 Нет текста или speechSynthesis не поддерживается');
        return;
    }
    
    const clean = text.replace(/[^\w\s\-äöüßÄÖÜ,?!.]/g, '');
    if (!clean.trim()) {
        console.warn('🔇 Текст пуст после очистки');
        return;
    }
    
    try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voice = getGermanVoice();
        if (voice) {
            utterance.voice = voice;
        }
        
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

// ========== ОЗВУЧКА С ЗАДАННОЙ СКОРОСТЬЮ И CALLBACK ==========
function speakWithSpeed(text, speed = 0.85, onEnd = null) {
    if (!text || !window.speechSynthesis) {
        console.warn('🔇 Нет текста или speechSynthesis не поддерживается');
        return null;
    }
    
    const clean = text.replace(/[^\w\s\-äöüßÄÖÜ,?!.]/g, '');
    if (!clean.trim()) {
        console.warn('🔇 Текст пуст после очистки');
        return null;
    }
    
    try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'de-DE';
        utterance.rate = speed;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voice = getGermanVoice();
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.onstart = function() {
            console.log(`🔊 Озвучка (${speed}×):`, clean.substring(0, 40) + (clean.length > 40 ? '...' : ''));
        };
        
        utterance.onerror = function(e) {
            console.warn('🔊 Ошибка озвучки:', e);
        };
        
        if (onEnd) {
            utterance.onend = function() {
                console.log('✅ Озвучка завершена');
                onEnd();
            };
        }
        
        window.speechSynthesis.speak(utterance);
        return utterance;
        
    } catch(e) {
        console.error('🔊 Критическая ошибка озвучки:', e);
        return null;
    }
}

// ========== ПРОВЕРКА ГОЛОСОВ ==========
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
if (typeof window !== 'undefined') {
    setTimeout(preloadVoices, 100);
    setTimeout(preloadVoices, 1000);
    setTimeout(preloadVoices, 3000);
}

// ========== ЭКСПОРТ ==========
window.speak = speak;
window.speakWithSpeed = speakWithSpeed;
window.checkVoices = checkVoices;

console.log('🔊 speak.js загружен');
