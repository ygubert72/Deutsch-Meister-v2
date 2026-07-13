// cardsGlobal.js — глобальные карточки для всех слов уровня

let globalCardsWords = [];
let globalCardsIndex = 0;
let globalCardsFlipped = false;
let globalCardsContainer = null;
let globalCardsLoading = false;

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
async function loadGlobalCards(container, level) {
    // Предотвращаем повторные вызовы
    if (globalCardsLoading) {
        console.log('⏳ Карточки уже загружаются, пропускаем');
        return;
    }
    
    console.log('🔄 loadGlobalCards вызван, уровень:', level);
    
    globalCardsContainer = container || document.getElementById('sectionContent');
    if (!globalCardsContainer) {
        console.error('❌ Контейнер не найден');
        return;
    }
    
    // Проверяем, что уровень передан
    const actualLevel = level || window.currentLevel || 'A1';
    if (!actualLevel) {
        console.error('❌ Уровень не указан');
        globalCardsContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">❌ Ошибка: уровень не указан</div>';
        return;
    }
    
    // Ждем загрузки курса
    let attempts = 0;
    while (!window.courseData && attempts < 20) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
        if (attempts > 10) {
            console.log(`⏳ Ожидание courseData... попытка ${attempts}`);
        }
    }
    
    if (!window.courseData) {
        globalCardsContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">⏳</div>
                <div>Данные курса загружаются...</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
        return;
    }
    
    globalCardsLoading = true;
    globalCardsContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка слов...</div>';
    
    try {
        const allWords = await window.getAllWordsForLevel(actualLevel);
        
        if (!allWords || allWords.length === 0) {
            globalCardsContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:#999;">
                    <div style="font-size:48px;margin-bottom:15px;">📭</div>
                    <div>Нет слов для уровня ${actualLevel}</div>
                    <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
                </div>
            `;
            globalCardsLoading = false;
            return;
        }
        
        window.shuffleArray(allWords);
        globalCardsWords = allWords;
        globalCardsIndex = 0;
        globalCardsFlipped = false;
        
        renderGlobalCards();
        
    } catch(e) {
        console.error('❌ Ошибка:', e);
        globalCardsContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">❌</div>
                <div>Ошибка загрузки: ${e.message}</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
    } finally {
        globalCardsLoading = false;
    }
}

// ========== РЕНДЕРИНГ ==========
function renderGlobalCards() {
    const container = globalCardsContainer;
    if (!container) {
        console.error('❌ Нет контейнера для рендеринга');
        return;
    }
    
    if (!globalCardsWords || globalCardsWords.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">📭</div>
                <div>Нет слов для этого уровня</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
        return;
    }
    
    const containerHtml = `
        <div style="text-align: center;">
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:15px;">
                <button class="dir-btn" id="globalDirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
                <button class="ctrl-btn" id="globalShuffleBtn" style="background:#FF9800; color:white; border:none;">🔄 ПЕРЕМЕШАТЬ</button>
                <button class="ctrl-btn" id="globalBackBtn" style="background:#E8F0FE; border:2px solid #D0D0D0;">← НАЗАД</button>
            </div>
            <div class="card" id="globalCard" style="cursor:pointer;">
                <div class="card-word" id="globalCardWord" style="font-size:28px; padding:30px;"></div>
            </div>
            <div class="btn-group" style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin:10px 0;">
                <button class="ctrl-btn" id="globalStudyBtn">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="globalContainerBtn">📦 В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="globalSpeakBtn">🔊 ОЗВУЧИТЬ</button>
                <button class="ctrl-btn" id="globalPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="globalNextBtn">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="globalResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
            <div style="font-size:14px;color:#888;margin-top:10px;">${globalCardsIndex + 1} / ${globalCardsWords.length}</div>
            <div class="hint" style="font-size:12px;color:#999;margin-top:8px;">👆 Нажмите на карточку для перевода</div>
        </div>
    `;
    
    container.innerHTML = containerHtml;
    updateCardDisplay();
    setupCardEventListeners(container);
}

// ========== НАСТРОЙКА ОБРАБОТЧИКОВ ==========
function setupCardEventListeners(container) {
    document.getElementById('globalCard').onclick = function() {
        globalCardsFlipped = !globalCardsFlipped;
        updateCardDisplay();
    };
    
    document.getElementById('globalPrevBtn').onclick = function() {
        if (globalCardsWords.length) {
            globalCardsIndex = (globalCardsIndex - 1 + globalCardsWords.length) % globalCardsWords.length;
            globalCardsFlipped = false;
            updateCardDisplay();
            if (typeof updateCounter === 'function') updateCounter();
        }
    };
    
    document.getElementById('globalNextBtn').onclick = function() {
        if (globalCardsWords.length) {
            globalCardsIndex = (globalCardsIndex + 1) % globalCardsWords.length;
            globalCardsFlipped = false;
            updateCardDisplay();
            if (typeof updateCounter === 'function') updateCounter();
        }
    };
    
    document.getElementById('globalResetStartBtn').onclick = function() {
        if (globalCardsWords.length) {
            globalCardsIndex = 0;
            globalCardsFlipped = false;
            updateCardDisplay();
            if (typeof updateCounter === 'function') updateCounter();
        }
    };
    
    document.getElementById('globalShuffleBtn').onclick = function() {
        if (globalCardsWords.length) {
            window.shuffleArray(globalCardsWords);
            globalCardsIndex = 0;
            globalCardsFlipped = false;
            updateCardDisplay();
            if (typeof updateCounter === 'function') updateCounter();
            const hint = container.querySelector('.hint');
            if (hint) {
                hint.textContent = '🔄 Перемешано!';
                setTimeout(() => { hint.textContent = '👆 Нажмите на карточку для перевода'; }, 1500);
            }
        }
    };
    
    document.getElementById('globalBackBtn').onclick = function() {
        if (typeof window.renderLevelWithMenu === 'function') {
            window.renderLevelWithMenu();
        }
    };
    
    document.getElementById('globalDirBtn').onclick = function() {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        globalCardsFlipped = false;
        updateCardDisplay();
        this.textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        if (typeof window.saveProgress === 'function') window.saveProgress();
    };
    
    document.getElementById('globalStudyBtn').onclick = function() {
        if (!globalCardsWords.length || !globalCardsWords[globalCardsIndex]) return;
        
        const word = globalCardsWords[globalCardsIndex];
        if (!window.wordsProgress) window.wordsProgress = {};
        const level = window.currentLevel || 'A1';
        if (!window.wordsProgress[level]) window.wordsProgress[level] = [];
        if (!window.wordsProgress[level].includes(word.de)) {
            window.wordsProgress[level].push(word.de);
            if (typeof window.saveProgress === 'function') window.saveProgress();
        }
        
        globalCardsWords.splice(globalCardsIndex, 1);
        if (globalCardsIndex >= globalCardsWords.length) globalCardsIndex = 0;
        updateCardDisplay();
        if (typeof updateCounter === 'function') updateCounter();
    };
    
    document.getElementById('globalContainerBtn').onclick = function() {
        // Используем ТУ ЖЕ логику, что и в quizMode
        showGlobalCardsContainer();
    };
    
    document.getElementById('globalSpeakBtn').onclick = function() {
        if (globalCardsWords[globalCardsIndex] && typeof window.speak === 'function') {
            window.speak(globalCardsWords[globalCardsIndex].de);
        }
    };
}

// ========== КОНТЕЙНЕР ДЛЯ КАРТОЧЕК (как в quizMode) ==========
function showGlobalCardsContainer() {
    const level = window.currentLevel || 'A1';
    if (!window.wordsProgress) window.wordsProgress = {};
    if (!window.wordsProgress[level]) window.wordsProgress[level] = [];
    
    // Получаем все слова уровня из прогресса
    const studiedWords = globalCardsWords.filter(word => 
        window.wordsProgress[level].includes(word.de)
    );
    
    if (!studiedWords || studiedWords.length === 0) {
        alert('📦 Контейнер пуст. Выучите слова, чтобы они появились здесь.');
        return;
    }
    
    // Удаляем старую модалку
    const oldModal = document.getElementById('containerModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'containerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex !important;
        justify-content: center;
        align-items: center;
        z-index: 9999999 !important;
        overflow: auto;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        margin: 20px;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">📦 КОНТЕЙНЕР (${studiedWords.length} слов)</h3>`;
    modalContent.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';
    
    studiedWords.forEach((word) => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
        item.innerHTML = `
            <span><strong>${word.de}</strong> — ${word.ru}</span>
            <button class="unstudy-btn" data-word="${word.de}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
        `;
        
        const btn = item.querySelector('.unstudy-btn');
        btn.addEventListener('click', function() {
            const wordDe = this.getAttribute('data-word');
            const level2 = window.currentLevel || 'A1';
            if (window.wordsProgress && window.wordsProgress[level2]) {
                const idx = window.wordsProgress[level2].indexOf(wordDe);
                if (idx !== -1) {
                    window.wordsProgress[level2].splice(idx, 1);
                    if (typeof window.saveProgress === 'function') window.saveProgress();
                }
            }
            // Обновляем контейнер
            modal.remove();
            showGlobalCardsContainer();
            // Обновляем карточки
            if (typeof window.loadGlobalCards === 'function') {
                window.loadGlobalCards(globalCardsContainer, window.currentLevel);
            }
        });
        
        itemsContainer.appendChild(item);
    });
    modalContent.appendChild(itemsContainer);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 15px 20px; border-top: 1px solid #ddd; display: flex; gap: 10px; flex-shrink: 0;';
    footer.innerHTML = `
        <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 ВЕРНУТЬ ВСЁ</button>
        <button id="closeContainerBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">ЗАКРЫТЬ</button>
    `;
    modalContent.appendChild(footer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    document.getElementById('returnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все слова из контейнера?')) return;
        const level3 = window.currentLevel || 'A1';
        if (window.wordsProgress) {
            window.wordsProgress[level3] = [];
            if (typeof window.saveProgress === 'function') window.saveProgress();
        }
        modal.remove();
        if (typeof window.loadGlobalCards === 'function') {
            window.loadGlobalCards(globalCardsContainer, window.currentLevel);
        }
    });

    document.getElementById('closeContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function updateCardDisplay() {
    const wordEl = document.getElementById('globalCardWord');
    if (!wordEl) return;
    
    if (!globalCardsWords.length) {
        wordEl.textContent = '🎉 Все слова изучены!';
        return;
    }
    
    const word = globalCardsWords[globalCardsIndex];
    if (!globalCardsFlipped) {
        wordEl.textContent = AppConfig.show_language === 'de' ? word.de : word.ru;
    } else {
        if (AppConfig.show_language === 'de') {
            wordEl.textContent = word.de + '\n\n➡️\n\n' + word.ru;
        } else {
            wordEl.textContent = word.ru + '\n\n➡️\n\n' + word.de;
        }
    }
}

// ========== ЭКСПОРТ ==========
window.loadGlobalCards = loadGlobalCards;
window.globalCardsWords = globalCardsWords;
window.renderGlobalCards = renderGlobalCards;

console.log('🃏 cardsGlobal.js загружен (исправлен)');
