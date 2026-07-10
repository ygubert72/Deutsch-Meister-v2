// ====================================================================
// yandexTTS.js — Озвучка через Yandex SpeechKit
// ====================================================================

// ========== НАСТРОЙКИ ==========
let YANDEX_API_KEY = '';
let YANDEX_FOLDER_ID = '';
let isYandexReady = false;

// Голоса Yandex SpeechKit (немецкие)
const YANDEX_VOICE_FEMALE = 'oksana';
const YANDEX_VOICE_MALE = 'alena';

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initYandexTTS(apiKey, folderId) {
    if (apiKey) {
        YANDEX_API_KEY = apiKey;
    }
    if (folderId) {
        YANDEX_FOLDER_ID = folderId;
    }
    if (YANDEX_API_KEY && YANDEX_FOLDER_ID) {
        isYandexReady = true;
        console.log('🎤 Yandex SpeechKit инициализирован');
        console.log('📁 Folder ID:', YANDEX_FOLDER_ID);
        console.log('🔑 API Key (первые 10 символов):', YANDEX_API_KEY.substring(0, 10) + '...');
        return true;
    } else {
        console.warn('⚠️ Yandex SpeechKit не инициализирован: не хватает данных');
        return false;
    }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ОЗВУЧКИ ==========
async function speakWithYandex(text, voice = YANDEX_VOICE_FEMALE) {
    if (!text) return;

    // Проверяем, что Яндекс готов
    if (!isYandexReady) {
        console.warn('⚠️ Yandex не настроен, используем fallback');
        if (window.speak) {
            window.speak(text);
            return new Promise(resolve => setTimeout(resolve, 1000));
        }
        return;
    }

    // Проверяем кэш
    const cachedAudio = await getCachedAudio(text, voice);
    if (cachedAudio) {
        console.log('📦 Воспроизведение из кэша');
        return playAudio(cachedAudio);
    }

    try {
        const audioData = await fetchFromYandex(text, voice);
        await saveToCache(text, voice, audioData);
        return playAudio(audioData);
    } catch (error) {
        console.error('❌ Ошибка Yandex TTS:', error);
        if (window.speak) {
            window.speak(text);
            return new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// ========== ЗАПРОС К YANDEX API ==========
async function fetchFromYandex(text, voice) {
    const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

    const params = new URLSearchParams({
        text: text,
        lang: 'de-DE',
        voice: voice,
        emotion: 'neutral',
        speed: 1.0,
        format: 'mp3',
        sampleRateHertz: 48000,
        folderId: YANDEX_FOLDER_ID,
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Api-Key ${YANDEX_API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        let errorMsg = `Yandex TTS ошибка: ${response.status}`;
        try {
            const errorText = await response.text();
            errorMsg += ` - ${errorText}`;
        } catch(e) {}
        throw new Error(errorMsg);
    }

    return await response.arrayBuffer();
}

// ========== ВОСПРОИЗВЕДЕНИЕ ==========
function playAudio(audioData) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
        };
        
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Ошибка воспроизведения'));
        };
        
        audio.play().catch(reject);
    });
}

// ========== КЭШИРОВАНИЕ (IndexedDB) ==========
let db = null;

function getDB() {
    if (db) return db;
    if (typeof Dexie === 'undefined') {
        console.warn('⚠️ Dexie не загружен, кэш не работает');
        return null;
    }
    db = new Dexie('TTSCache');
    db.version(1).stores({
        cache: '++id, key, voice'
    });
    return db;
}

async function getCachedAudio(text, voice) {
    try {
        const db = getDB();
        if (!db) return null;
        const key = text.trim() + '|' + voice;
        const result = await db.cache.where('key').equals(key).first();
        return result ? result.audio : null;
    } catch {
        return null;
    }
}

async function saveToCache(text, voice, audio) {
    try {
        const db = getDB();
        if (!db) return;
        const key = text.trim() + '|' + voice;
        await db.cache.add({ key, voice, audio });
        console.log('💾 Сохранено в кэш');
    } catch (error) {
        console.warn('Не удалось сохранить в кэш:', error);
    }
}

// ========== ВЫБОР ГОЛОСА ПО ИМЕНИ ==========
function getVoiceForSpeaker(speakerName) {
    const femaleNames = ['Anna', 'Maria', 'Julia', 'Laura', 'Lisa', 'Sophie', 'Emma', 'Mia', 'Frau', 'Oma', 'Mutter', 'Schwester', 'Tante'];
    const maleNames = ['Tom', 'Peter', 'Max', 'Paul', 'Lukas', 'Felix', 'Opa', 'Vater', 'Bruder', 'Onkel', 'Herr'];
    
    if (femaleNames.some(name => speakerName.includes(name))) {
        return YANDEX_VOICE_FEMALE;
    }
    if (maleNames.some(name => speakerName.includes(name))) {
        return YANDEX_VOICE_MALE;
    }
    return YANDEX_VOICE_FEMALE;
}

// ========== ДИАЛОГ ==========
async function speakDialog(dialogText) {
    const lines = dialogText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;
    
    const speeches = lines.map(line => {
        const match = line.match(/^([A-ZÄÖÜ][a-zäöüß]*):\s*(.*)/);
        if (match) {
            return {
                speaker: match[1],
                text: match[2].trim()
            };
        }
        return null;
    }).filter(s => s !== null);
    
    if (speeches.length === 0) return;
    
    for (let i = 0; i < speeches.length; i++) {
        const speech = speeches[i];
        const voice = getVoiceForSpeaker(speech.speaker);
        await speakWithYandex(speech.text, voice);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// ========== ЭКСПОРТ ==========
window.speakWithYandex = speakWithYandex;
window.speakDialog = speakDialog;
window.initYandexTTS = initYandexTTS;
window.getVoiceForSpeaker = getVoiceForSpeaker;

console.log('🎤 Yandex SpeechKit загружен!');
console.log('📌 Для настройки вызови: initYandexTTS("API_КЛЮЧ", "FOLDER_ID")');
