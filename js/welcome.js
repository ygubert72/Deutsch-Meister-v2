// ============================================================
// welcome.js — Приветственная страница
// ============================================================

function showWelcomePage() {
    window.isWelcomePageVisible = true;
    window.currentLevel = 'A1';
    window.currentLesson = null;
    window.courseData = null;
    
    const content = document.getElementById('content');
    const indicator = document.getElementById('modeIndicator');
    const counter = document.getElementById('counter');
    
    indicator.textContent = '🏠 Главная';
    if (counter) counter.textContent = '';
    
    const flagSvg = window.GERMAN_FLAG_SVG || '';
    
    content.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:70vh; text-align:center; padding:20px;">
            <div style="margin-bottom:20px;">
                ${flagSvg}
            </div>
            <h1 style="font-size:42px; color:#1A1A1A; margin:0 0 10px 0;">Deutsch-Meister</h1>
            <p style="font-size:20px; color:#3B6FE0; margin:0 0 5px 0; font-weight:500;">Добро пожаловать в Deutsch-Meister!</p>
            <p style="font-size:18px; color:#1A1A1A; margin:5px 0 20px 0; font-style:italic;">
                Übung macht den Meister — Практика делает мастера.
            </p>
            <p style="font-size:16px; color:#1A1A1A; max-width:550px; margin:0 auto 10px auto; line-height:1.7;">
                Изучайте немецкий язык с нуля до уровня C1 по нашей современной методике.
            </p>
            <p style="font-size:14px; color:#1A1A1A; max-width:550px; margin:0 auto 30px auto; line-height:1.7;">
                Выберите свой уровень в меню слева и начинайте обучение.<br>
                Все уроки содержат грамматику, тесты, тренажёр, диктант и аудирование.
            </p>
            <button onclick="showInstruction()" style="padding:12px 40px; background:linear-gradient(135deg, #3B6FE0, #2B5BC7); color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold; box-shadow:0 4px 15px rgba(59,111,224,0.3); transition:all 0.1s ease;">
                ❓ Инструкция
            </button>
            <div style="margin-top:20px; font-size:13px; color:#1A1A1A;">
                🔒 A1 — доступен всем &nbsp;·&nbsp; A2 — после регистрации &nbsp;·&nbsp; B1-C1 — с премиумом
            </div>
        </div>
    `;
    
    document.getElementById('modeIndicator').textContent = '🏠 Главная';
    
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 100);
    }
    
    if (typeof window.saveState === 'function') {
        window.saveState();
    }
}

// Экспорт
window.showWelcomePage = showWelcomePage;

console.log('🏠 welcome.js загружен');
