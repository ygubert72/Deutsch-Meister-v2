// ====================================================================
// azureTTS.js — Озвучка через Azure Neural TTS (высокое качество)
// ====================================================================

// 🔑 НАСТРОЙКИ — замени на свои!
const AZURE_KEY = 'YOUR_AZURE_KEY';           // Твой API-ключ
const AZURE_REGION = 'eastus';                // Твой регион
const AZURE_VOICE_FEMALE = 'de-DE-KatjaNeural';   // Женский голос
const AZURE_VOICE_MALE = 'de-DE-ConradNeural';     // Мужской голос

// ========== СОСТОЯНИЕ ==========
let isAzureReady = false;
let preferredVoice = AZURE_VOICE_FEMALE;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initAzureTTS(key, region) {
    if (key && key !== 'YOUR_AZURE_KEY') {
        AZURE_KEY = key;
    }
    if (region && region !== 'eastus') {
        AZURE_REGION = region;
    }
    isAzureReady = true;
    console.log('🎤 Azure TTS инициализирован');
}

// ========== ОЗВУЧКА ==========
async function speakWithAzure(text, voice = preferredVoice) {
    if (!text) return;

    // Если Azure не готов — используем fallback (speak.js)
    if (!isAzureReady || !AZURE_KEY || AZURE_KEY === 'YOUR_AZURE_KEY') {
        console.warn('⚠️ Azure не настроен, используем fallback');
        if (window.speak) window.speak(text);
        return;
    }

    // 1. Проверяем кэш в IndexedDB
    const cachedAudio = await getCachedAudio(text, voice);
    if (cachedAudio) {
        console.log('📦 Воспроизведение из кэша');
        playAudio(cachedAudio);
        return;
    }

    // 2. Если кэша нет — запрашиваем у Azure
    try {
        const audioData = await fetchFromAzure(text, voice);
        await saveToCache(text, voice, audioData);
        playAudio(audioData);
    } catch (error) {
        console.error('❌ Ошибка Azure TTS:', error);
        // Fallback на speak.js при ошибке
        if (window.speak) window.speak(text);
    }
}

// ========== ЗАПРОС К AZURE API ==========
async function fetchFromAzure(text, voice) {
    const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE">
            <voice name="${voice}">
                <prosody rate="0%">${text}</prosody>
            </voice>
        </speak>
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': AZURE_KEY,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        },
        body: ssml,
    });

    if (!response.ok) {
        let errorMsg = `Azure TTS ошибка: ${response.status}`;
        try {
            const errorText = await response.text();
            errorMsg += ` - ${errorText}`;
        } catch(e) {}
        throw new Error(errorMsg);
    }

    return await response.arrayBuffer();
}

// ========== ВОСПРОИЗВЕДЕНИЕ AUDIO ==========
function playAudio(audioData) {
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
}

// ========== РАБОТА С КЭШЕМ (IndexedDB) ==========
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

// ========== ВЫБОР ГОЛОСА ==========
function setVoice(voice) {
    if (voice === 'male') {
        preferredVoice = AZURE_VOICE_MALE;
    } else if (voice === 'female') {
        preferredVoice = AZURE_VOICE_FEMALE;
    }
    console.log('🎤 Выбран голос:', preferredVoice);
}

function getVoiceForSpeaker(speakerName) {
    const femaleNames = ['Anna', 'Maria', 'Julia', 'Laura', 'Lisa', 'Sophie', 'Emma', 'Mia', 'Frau', 'Oma', 'Mutter', 'Schwester', 'Tante'];
    const maleNames = ['Tom', 'Peter', 'Max', 'Paul', 'Lukas', 'Felix', 'Opa', 'Vater', 'Bruder', 'Onkel', 'Herr'];
    
    if (femaleNames.some(name => speakerName.includes(name))) {
        return AZURE_VOICE_FEMALE;
    }
    if (maleNames.some(name => speakerName.includes(name))) {
        return AZURE_VOICE_MALE;
    }
    return preferredVoice;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ДЛЯ ДИАЛОГОВ ==========
async function speakDialog(dialogText) {
    // Убираем имена говорящих (Anna:, Tom:)
    let cleanText = dialogText
        .replace(/^[A-ZÄÖÜ][a-zäöüß]*:\s*/gm, '')
        .trim()
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Определяем, какой голос использовать
    const firstSpeaker = dialogText.match(/^([A-ZÄÖÜ][a-zäöüß]*):/);
    const speaker = firstSpeaker ? firstSpeaker[1] : '';
    const voice = getVoiceForSpeaker(speaker);

    await speakWithAzure(cleanText, voice);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function clearCache() {
    const db = getDB();
    if (db) {
        db.cache.clear();
        console.log('🗑️ Кэш очищен');
    }
}

// ========== ПРОВЕРКА НАСТРОЙКИ ==========
function checkAzureConfig() {
    if (!AZURE_KEY || AZURE_KEY === 'YOUR_AZURE_KEY') {
        console.warn('⚠️ Azure API ключ не настроен');
        return false;
    }
    if (!AZURE_REGION || AZURE_REGION === 'eastus') {
        console.warn('⚠️ Azure регион не настроен (используется eastus по умолчанию)');
    }
    return true;
}

// ========== ЭКСПОРТ ==========
window.speakWithAzure = speakWithAzure;
window.speakDialog = speakDialog;
window.setVoice = setVoice;
window.initAzureTTS = initAzureTTS;
window.clearAzureCache = clearCache;
window.checkAzureConfig = checkAzureConfig;

console.log('🎤 Azure TTS загружен!');
console.log('📌 Для настройки вызови: initAzureTTS("КЛЮЧ", "РЕГИОН")');
