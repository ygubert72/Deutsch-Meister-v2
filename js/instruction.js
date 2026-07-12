// ============================================================
// instruction.js — Страница инструкции
// ============================================================

// ========== ПОКАЗАТЬ ИНСТРУКЦИЮ ==========
function showInstruction() {
    const content = document.getElementById('content');
    const indicator = document.getElementById('modeIndicator');
    const counter = document.getElementById('counter');
    
    const previousPage = typeof window.isWelcomePageVisible !== 'undefined' && window.isWelcomePageVisible ? 'welcome' : 'level';
    indicator.textContent = '❓ Инструкция';
    if (counter) counter.textContent = '';
    
    content.innerHTML = `
        <div style="max-width:800px; margin:0 auto; padding:20px 15px;">
            <button onclick="window.goBackFromInstruction()" 
                    style="padding:8px 20px; background:#E8F0FE; border:2px solid #D0D0D0; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:20px; transition:all 0.08s ease;">
                ← Назад
            </button>
            
            <h1 style="font-size:32px; color:#1A1A1A; margin:0 0 25px 0;">❓ Инструкция</h1>
            
            <div style="background:#f8f9fa; border-radius:12px; padding:20px; margin-bottom:20px;">
                <h3 style="margin:0 0 15px 0; color:#1A1A1A; font-size:18px;">📚 Как пользоваться Deutsch-Meister</h3>
                <ul style="list-style:none; padding:0; margin:0; line-height:2.2; font-size:15px; color:#1A1A1A;">
                    <li><strong>Выберите уровень</strong> — A1, A2, B1, B2 или C1 в меню слева</li>
                    <li><strong>Откройте урок</strong> — нажмите на нужный урок в списке</li>
                    <li><strong>Изучайте грамматику</strong> <span style="font-size:20px;">📘</span> — теория, примеры, словарь и упражнения</li>
                    <li><strong>Тренируйте слова</strong> <span style="font-size:20px;">🎯</span> — режим «Тест» с карточками и контейнером</li>
                    <li><strong>Собирайте фразы</strong> <span style="font-size:20px;">🧩</span> — режим «Тренажёр» из слов</li>
                    <li><strong>Пишите диктанты</strong> <span style="font-size:20px;">✏️</span> — проверяйте правописание</li>
                    <li><strong>Слушайте аудирование</strong> <span style="font-size:20px;">🎧</span> — развивайте навыки восприятия на слух</li>
                </ul>
            </div>
            
            <div style="background:#FFF8E1; border-radius:12px; padding:15px 20px; margin-bottom:15px; border-left:4px solid #FFC107;">
                <p style="margin:0; font-size:14px; color:#1A1A1A;">
                    💡 <strong>Прогресс сохраняется автоматически</strong> — слова и фразы, отмеченные как «Изучено», попадают в контейнер и не повторяются.
                </p>
            </div>
            
            <div style="background:#E8F5E9; border-radius:12px; padding:15px 20px; border-left:4px solid #4CAF50;">
                <p style="margin:0; font-size:14px; color:#1A1A1A;">
                    🔐 <strong>Доступ к уровням:</strong> A1 — доступен всем · A2 — после регистрации · B1-C1 — с премиум-доступом
                </p>
            </div>
        </div>
    `;
    
    window._instructionReturnPage = previousPage;
}

// ========== ВОЗВРАТ ИЗ ИНСТРУКЦИИ ==========
window.goBackFromInstruction = function() {
    if (window._instructionReturnPage === 'welcome') {
        if (typeof window.showWelcomePage === 'function') {
            window.showWelcomePage();
        }
    } else {
        if (typeof window.currentLesson !== 'undefined' && window.currentLesson) {
            if (typeof window.renderLesson === 'function') {
                window.renderLesson(window.currentLesson);
                return;
            }
        }
        if (typeof window.courseData !== 'undefined' && window.courseData) {
            if (typeof window.renderLevel === 'function') {
                window.renderLevel();
                return;
            }
        }
        if (typeof window.showWelcomePage === 'function') {
            window.showWelcomePage();
        }
    }
};

// Экспорт
window.showInstruction = showInstruction;

console.log('❓ instruction.js загружен');
