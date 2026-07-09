// ====================================================================
// azureTTS.js — Озвучка через Azure Neural TTS (высокое качество)
// ====================================================================

// 🔑 НАСТРОЙКИ — замени на свои!
const AZURE_KEY = 'YOUR_AZURE_KEY';
const AZURE_REGION = 'eastus';
const AZURE_VOICE_FEMALE = 'de-DE-KatjaNeural';
const AZURE_VOICE_MALE = 'de-DE-ConradNeural';

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

    if (!isAzureReady || !AZURE_KEY || AZURE_KEY === 'YOUR_AZURE_KEY') {
        console.warn('⚠️ Azure не настроен, используем fallback');
        if (window.speak) {
            window.speak(text);
            return new Promise(resolve => setTimeout(resolve, 1000));
        }
        return;
    }

    const cachedAudio = await getCachedAudio(text, voice);
    if (cachedAudio) {
        console.log('📦 Воспроизведение из кэша');
        return playAudio(cachedAudio);
    }

    try {
        const audioData = await fetchFromAzure(text, voice);
        await saveToCache(text, voice, audioData);
        return playAudio(audioData);
    } catch (error) {
        console.error('❌ Ошибка Azure TTS:', error);
        if (window.speak) {
            window.speak(text);
            return new Promise(resolve => setTimeout(resolve, 1000));
        }
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

// ========== ВОСПРОИЗВЕДЕНИЕ AUDIO (С ПРОМИСОМ) ==========
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

// ========== ВЫБОР ГОЛОСА ПО ИМЕНИ ГОВОРЯЩЕГО ==========
function getVoiceForSpeaker(speakerName) {
    const femaleNames = ['Anna', 'Maria', 'Julia', 'Laura', 'Lisa', 'Sophie', 'Emma', 'Mia', 'Frau', 'Oma', 'Mutter', 'Schwester', 'Tante', 'Person A'];
    const maleNames = ['Tom', 'Peter', 'Max', 'Paul', 'Lukas', 'Felix', 'Opa', 'Vater', 'Bruder', 'Onkel', 'Herr', 'Person B'];
    
    if (femaleNames.some(name => speakerName.includes(name))) {
        return AZURE_VOICE_FEMALE;
    }
    if (maleNames.some(name => speakerName.includes(name))) {
        return AZURE_VOICE_MALE;
    }
    return AZURE_VOICE_FEMALE;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ДЛЯ ДИАЛОГОВ ==========
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
        await speakWithAzure(speech.text, voice);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// ========== ЭКСПОРТ ==========
window.speakWithAzure = speakWithAzure;
window.speakDialog = speakDialog;
window.initAzureTTS = initAzureTTS;
window.getVoiceForSpeaker = getVoiceForSpeaker;

console.log('🎤 Azure TTS загружен!');
console.log('📌 Для настройки вызови: initAzureTTS("КЛЮЧ", "РЕГИОН")');
