// phrasesGlobal.js — глобальные фразы для всех фраз уровня

let globalPhrasesWords = [];
let globalPhrasesIndex = 0;
let globalPhrasesContainer = null;
let globalPhrasesSelected = [];
let globalPhrasesAvailable = [];
let globalPhrasesActive = {};
let globalPhrasesHintIndex = 0;
let globalPhrasesDirection = 'ru_to_de';
let globalPhrasesStudied = {};
let globalPhrasesLoading = false;
let globalPhrasesPendingLevel = null;

// ========== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ==========
async function loadGlobalPhrases(container, level) {
    // Если уже загружается — запоминаем запрос и выходим
    if (globalPhrasesLoading) {
        console.log('⏳ Фразы уже загружаются, запоминаем запрос...');
        globalPhrasesPendingLevel = level;
        if (container) globalPhrasesContainer = container;
        return;
    }
    
    globalPhrasesContainer = container;
    globalPhrasesLoading = true;
    globalPhrasesPendingLevel = null;
    console.log('🔄 Начинаем загрузку фраз...');
    
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
        
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка всех фраз уровня...</div>';
        
        const allPhrases = await window.getAllPhrasesForLevel(level);
        
        if (!allPhrases || allPhrases.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Нет фраз для этого уровня</div>';
            return;
        }
        
        window.shuffleArray(allPhrases);
        globalPhrasesWords = allPhrases;
        globalPhrasesIndex = 0;
        globalPhrasesDirection = 'ru_to_de';
        globalPhrasesStudied = {};
        
        loadGlobalPhrasesProgress(level);
        renderGlobalPhrases(container);
        
    } catch(e) {
        console.error('❌ Ошибка загрузки фраз:', e);
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">❌</div>
                <div>Ошибка загрузки фраз</div>
                <div style="font-size:14px;margin-top:10px;">${e.message}</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
    } finally {
        globalPhrasesLoading = false;
        console.log('✅ Флаг загрузки фраз сброшен');
        
        // Если есть отложенный запрос — выполняем его
        if (globalPhrasesPendingLevel) {
            const pendingLevel = globalPhrasesPendingLevel;
            globalPhrasesPendingLevel = null;
            console.log(`🔄 Выполняем отложенный запрос для уровня ${pendingLevel}...`);
            loadGlobalPhrases(globalPhrasesContainer, pendingLevel);
        }
    }
}

// ========== ОСТАЛЬНОЙ КОД БЕЗ ИЗМЕНЕНИЙ ==========
// (остальная часть phrasesGlobal.js — та же, что была)

// ========== ЭКСПОРТ ==========
window.loadGlobalPhrases = loadGlobalPhrases;
window.globalPhrasesWords = globalPhrasesWords;

console.log('🧩 phrasesGlobal.js загружен');
