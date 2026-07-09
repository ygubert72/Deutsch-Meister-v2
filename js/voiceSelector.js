// ====================================================================
// voiceSelector.js — Выбор мужского и женского голоса из системы
// ====================================================================

let femaleVoice = null;
let maleVoice = null;
let voicesLoaded = false;

// ========== ЗАГРУЗКА ГОЛОСОВ ==========
function loadVoices() {
    return new Promise((resolve) => {
        if (voicesLoaded) {
            resolve();
            return;
        }
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            selectVoices(voices);
            voicesLoaded = true;
            resolve();
        } else {
            window.speechSynthesis.onvoiceschanged = function() {
                const newVoices = window.speechSynthesis.getVoices();
                selectVoices(newVoices);
                voicesLoaded = true;
                resolve();
            };
        }
    });
}

// ========== ВЫБОР ГОЛОСОВ ==========
function selectVoices(voices) {
    const germanVoices = voices.filter(v => v.lang === 'de-DE' || v.lang === 'de');
    
    console.log('🎤 Доступные немецкие голоса:', germanVoices.map(v => v.name).join(', '));
    
    // === ЖЕНСКИЙ ГОЛОС ===
    femaleVoice = 
        // Приоритет 1: Google Neural женские
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Wavenet-A')) ||
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Wavenet-C')) ||
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Neural2-C')) ||
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Neural2-F')) ||
        // Приоритет 2: Любой Google женский
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE')) ||
        // Приоритет 3: Любой женский голос
        germanVoices.find(v => v.name.toLowerCase().includes('female')) ||
        // Приоритет 4: Первый немецкий голос
        germanVoices[0] ||
        // Приоритет 5: Первый голос вообще
        voices[0];
    
    // === МУЖСКОЙ ГОЛОС ===
    maleVoice = 
        // Приоритет 1: Google Neural мужские
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Wavenet-B')) ||
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Wavenet-D')) ||
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Neural2-B')) ||
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE-Neural2-D')) ||
        // Приоритет 2: Любой Google мужской (если не нашли женский)
        germanVoices.find(v => v.name.includes('Google') && v.name.includes('de-DE')) ||
        // Приоритет 3: Любой мужской голос
        germanVoices.find(v => v.name.toLowerCase().includes('male')) ||
        // Приоритет 4: Второй немецкий голос
        germanVoices[1] ||
        // Приоритет 5: Первый голос вообще
        voices[0];
    
    console.log('👩 Женский голос:', femaleVoice?.name || 'не найден');
    console.log('👨 Мужской голос:', maleVoice?.name || 'не найден');
}

// ========== ОЗВУЧКА ОДНОЙ ФРАЗЫ ==========
function speakWithVoice(text, gender = 'female') {
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voice = gender === 'male' ? maleVoice : femaleVoice;
    if (voice) {
        utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// ========== ОЗВУЧКА ДИАЛОГА ПО РЕПЛИКАМ ==========
async function speakDialogWithVoices(dialogText) {
    await loadVoices();
    
    // Разбиваем диалог на реплики
    const lines = dialogText.split('\n').filter(line => line.trim() !== '');
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
    
    if (speeches.length === 0) {
        // Если не удалось разобрать — озвучиваем целиком
        speakWithVoice(dialogText.replace(/^[A-ZÄÖÜ][a-zäöüß]*:\s*/gm, '').trim(), 'female');
        return;
    }
    
    // Определяем пол по имени
    const femaleNames = ['Anna', 'Maria', 'Julia', 'Laura', 'Lisa', 'Sophie', 'Emma', 'Mia', 'Frau', 'Oma', 'Mutter', 'Schwester', 'Tante'];
    const maleNames = ['Tom', 'Peter', 'Max', 'Paul', 'Lukas', 'Felix', 'Opa', 'Vater', 'Bruder', 'Onkel', 'Herr'];
    
    for (let i = 0; i < speeches.length; i++) {
        const speech = speeches[i];
        let gender = 'female';
        
        if (maleNames.some(name => speech.speaker.includes(name))) {
            gender = 'male';
        } else if (femaleNames.some(name => speech.speaker.includes(name))) {
            gender = 'female';
        }
        
        speakWithVoice(speech.text, gender);
        await new Promise(resolve => setTimeout(resolve, 400));
    }
}

// ========== ЭКСПОРТ ==========
window.loadVoices = loadVoices;
window.speakWithVoice = speakWithVoice;
window.speakDialogWithVoices = speakDialogWithVoices;

console.log('🎤 voiceSelector.js загружен!');
