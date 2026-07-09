// ====================================================================
// yandexTTS.js — Озвучка через локальный прокси
// ====================================================================

// ========== НАСТРОЙКИ ==========
// URL твоего локального прокси
const TTS_PROXY_URL = 'http://localhost:3000/tts';

// Голоса Yandex SpeechKit (немецкие)
const YANDEX_VOICE_FEMALE = 'oksana';
const YANDEX_VOICE_MALE = 'alena';

// ========== ОСНОВНАЯ ФУНКЦИЯ ОЗВУЧКИ ==========
async function speakWithYandex(text, voice = YANDEX_VOICE_FEMALE) {
    if (!text) return;

    try {
        // Отправляем запрос к локальному прокси
        const response = await fetch(TTS_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, voice }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Прокси ошибка:', response.status, errorText);
            // Fallback на speak.js
            if (window.speak) {
                window.speak(text);
                return new Promise(resolve => setTimeout(resolve, 1000));
            }
            return;
        }

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        
        return new Promise((resolve, reject) => {
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

    } catch (error) {
        console.error('❌ Ошибка озвучки:', error);
        if (window.speak) {
            window.speak(text);
            return new Promise(resolve => setTimeout(resolve, 1000));
        }
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
window.getVoiceForSpeaker = getVoiceForSpeaker;

console.log('🎤 Yandex TTS (через прокси) загружен!');
console.log('📌 Прокси URL:', TTS_PROXY_URL);
