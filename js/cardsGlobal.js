// cardsGlobal.js — глобальные карточки для всех слов уровня

let globalCardsWords = [];
let globalCardsIndex = 0;
let globalCardsFlipped = false;
let globalCardsContainer = null;
let globalCardsLoading = false;
let globalCardsPendingLevel = null;

// ========== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ==========
async function loadGlobalCards(container, level) {
    // Если уже загружается — запоминаем запрос и выходим
    if (globalCardsLoading) {
        console.log('⏳ Карточки уже загружаются, запоминаем запрос...');
        globalCardsPendingLevel = level;
        // Сохраняем контейнер на случай, если он изменился
        if (container) globalCardsContainer = container;
        return;
    }
    
    globalCardsContainer = container;
    globalCardsLoading = true;
    globalCardsPendingLevel = null;
    console.log('🔄 Начинаем загрузку карточек...');
    
    try {
        // Проверяем, есть ли курс
        if (!window.courseData) {
            console.log('⏳ courseData ещё не загружен, пробуем подождать...');
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка данных курса...</div>';
            
            let attempts = 0;
            while (!window.courseData && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.courseData) {
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#999;">
                        <div style="font-size:48px;margin-bottom:15px;">❌</div>
                        <div>Курс не загружен. Попробуйте выбрать уровень заново.</div>
                        <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
                    </div>
                `;
                return;
            }
        }
        
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка всех слов уровня...</div>';
        
        const allWords = await window.getAllWordsForLevel(level);
        
        if (!allWords || allWords.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Нет слов для этого уровня</div>';
            return;
        }
        
        window.shuffleArray(allWords);
        globalCardsWords = allWords;
        globalCardsIndex = 0;
        globalCardsFlipped = false;
        
        renderGlobalCards(container);
        
    } catch(e) {
        console.error('❌ Ошибка загрузки карточек:', e);
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">❌</div>
                <div>Ошибка загрузки карточек</div>
                <div style="font-size:14px;margin-top:10px;">${e.message}</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
    } finally {
        globalCardsLoading = false;
        console.log('✅ Флаг загрузки карточек сброшен');
        
        // Если есть отложенный запрос — выполняем его
        if (globalCardsPendingLevel) {
            const pendingLevel = globalCardsPendingLevel;
            globalCardsPendingLevel = null;
            console.log(`🔄 Выполняем отложенный запрос для уровня ${pendingLevel}...`);
            loadGlobalCards(globalCardsContainer, pendingLevel);
        }
    }
}

// ========== ОСТАЛЬНОЙ КОД БЕЗ ИЗМЕНЕНИЙ ==========
// (остальная часть cardsGlobal.js — та же, что была)

// ========== ЭКСПОРТ ==========
window.loadGlobalCards = loadGlobalCards;
window.globalCardsWords = globalCardsWords;

console.log('🃏 cardsGlobal.js загружен');
