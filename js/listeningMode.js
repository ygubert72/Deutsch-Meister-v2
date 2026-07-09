// ========== ОЗВУЧИВАНИЕ ДИАЛОГА ПО РЕПЛИКАМ ==========
function speakDialog() {
    // 1. Разбиваем диалог на отдельные реплики
    const lines = dialog.text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) return;
    
    // 2. Определяем, кто говорит в каждой реплике
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
    
    // 3. Озвучиваем реплики последовательно (одну за другой)
    let index = 0;
    
    function speakNext() {
        if (index >= speeches.length) return;
        
        const speech = speeches[index];
        const voice = window.getVoiceForSpeaker ? window.getVoiceForSpeaker(speech.speaker) : null;
        
        console.log(`🗣️ ${speech.speaker}: ${speech.text}`);
        
        if (typeof window.speakWithAzure === 'function') {
            window.speakWithAzure(speech.text, voice)
                .then(() => {
                    // После окончания озвучки — переходим к следующей реплике
                    index++;
                    // Небольшая пауза между репликами (300ms)
                    setTimeout(speakNext, 300);
                })
                .catch(() => {
                    // Если ошибка — пропускаем реплику
                    index++;
                    setTimeout(speakNext, 100);
                });
        } else if (typeof window.speak === 'function') {
            // Fallback на старую озвучку
            window.speak(speech.text);
            index++;
            setTimeout(speakNext, 500);
        } else {
            console.warn('⚠️ Озвучка не доступна');
            index++;
            setTimeout(speakNext, 100);
        }
    }
    
    // Начинаем с первой реплики
    speakNext();
}

window._speakDialog = speakDialog;
