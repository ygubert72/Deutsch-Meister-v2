// ====================================================================
// speak.js — Озвучка текста (используется во всех режимах)
// ====================================================================

function speak(text) {
    if (!text || !window.speechSynthesis) return;
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch(e) {
        console.log('Ошибка озвучки:', e);
    }
}
