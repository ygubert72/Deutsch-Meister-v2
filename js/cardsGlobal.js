// cardsGlobal.js — глобальные карточки для всех слов уровня

let globalCardsWords = [];
let globalCardsIndex = 0;
let globalCardsFlipped = false;
let globalCardsContainer = null;
let globalCardsLoading = false;

// ========== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ==========
async function loadGlobalCards(container, level) {
    // Защита от повторных загрузок
    if (globalCardsLoading) {
        console.log('⏳ Карточки уже загружаются, пропускаем...');
        return;
    }
    
    globalCardsContainer = container;
    globalCardsLoading = true;
    console.log('🔄 Начинаем загрузку карточек...');
    
    try {
        // Проверяем, есть ли курс
        if (!window.courseData) {
            console.log('⏳ courseData ещё не загружен, пробуем подождать...');
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка данных курса...</div>';
            
            // Ждём максимум 2 секунды
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
        
        // Перемешиваем
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
        // ВАЖНО: сбрасываем флаг загрузки
        globalCardsLoading = false;
        console.log('✅ Флаг загрузки карточек сброшен');
    }
}

// ========== ОТОБРАЖЕНИЕ КАРТОЧЕК ==========
function renderGlobalCards(container) {
    if (!container) container = globalCardsContainer;
    if (!container) return;
    
    const isMobile = window.utils && window.utils.isMobileDevice();
    
    if (isMobile) {
        renderGlobalCardsMobile(container);
    } else {
        renderGlobalCardsDesktop(container);
    }
}

// ========== ДЕСКТОПНАЯ ВЕРСИЯ ==========
function renderGlobalCardsDesktop(container) {
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:15px;">
                <button class="dir-btn" id="globalDirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
                <button class="ctrl-btn" id="globalShuffleBtn" style="background:#FF9800; color:white; border:none;">🔄 ПЕРЕМЕШАТЬ</button>
                <button class="ctrl-btn" id="globalBackBtn" style="background:#E8F0FE; border:2px solid #D0D0D0;">← НАЗАД</button>
            </div>
            <div class="card" id="globalCard">
                <div class="card-word" id="globalCardWord"></div>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="globalStudyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="globalContainerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="globalSpeakBtn">🔊</button>
                <button class="ctrl-btn" id="globalPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="globalNextBtn">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="globalResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
            <div style="font-size:14px;color:#888;margin-top:10px;">${globalCardsIndex + 1} / ${globalCardsWords.length}</div>
            <div class="hint">Нажмите на карточку для перевода</div>
        </div>
    `;
    
    function getCurrentWordText() {
        if (!globalCardsWords.length) return '🎉 Все слова изучены!';
        const word = globalCardsWords[globalCardsIndex];
        if (!globalCardsFlipped) {
            return AppConfig.show_language === 'de' ? word.de : word.ru;
        } else {
            if (AppConfig.show_language === 'de') {
                return word.de + '\n\n➡️\n\n' + word.ru;
            } else {
                return word.ru + '\n\n➡️\n\n' + word.de;
            }
        }
    }
    
    function updateGlobalCardDisplay() {
        const wordEl = document.getElementById('globalCardWord');
        if (!wordEl) return;
        if (!globalCardsWords.length) {
            wordEl.textContent = '🎉 Все слова изучены!';
            return;
        }
        wordEl.textContent = getCurrentWordText();
    }
    
    function goToGlobalPrev() {
        if (globalCardsWords.length) {
            globalCardsIndex = globalCardsIndex === 0 ? globalCardsWords.length - 1 : globalCardsIndex - 1;
            globalCardsFlipped = false;
            updateGlobalCardDisplay();
            updateGlobalCounter();
        }
    }
    
    function goToGlobalNext() {
        if (globalCardsWords.length) {
            globalCardsIndex = (globalCardsIndex + 1) % globalCardsWords.length;
            globalCardsFlipped = false;
            updateGlobalCardDisplay();
            updateGlobalCounter();
        }
    }
    
    function goToGlobalStart() {
        if (globalCardsWords.length) {
            globalCardsIndex = 0;
            globalCardsFlipped = false;
            updateGlobalCardDisplay();
            updateGlobalCounter();
        }
    }
    
    function shuffleGlobalCards() {
        window.shuffleArray(globalCardsWords);
        globalCardsIndex = 0;
        globalCardsFlipped = false;
        updateGlobalCardDisplay();
        updateGlobalCounter();
        const hint = container.querySelector('.hint');
        if (hint) hint.textContent = '🔄 Перемешано! Нажмите на карточку для перевода';
        setTimeout(() => {
            if (hint) hint.textContent = 'Нажмите на карточку для перевода';
        }, 1500);
    }
    
    function updateGlobalCounter() {
        const progress = container.querySelector('.btn-group + div');
        if (progress && globalCardsWords.length) {
            progress.textContent = `${globalCardsIndex + 1} / ${globalCardsWords.length}`;
        }
    }
    
    updateGlobalCardDisplay();
    
    document.getElementById('globalPrevBtn').onclick = goToGlobalPrev;
    document.getElementById('globalNextBtn').onclick = goToGlobalNext;
    document.getElementById('globalResetStartBtn').onclick = goToGlobalStart;
    document.getElementById('globalShuffleBtn').onclick = shuffleGlobalCards;
    
    document.getElementById('globalBackBtn').onclick = function() {
        if (typeof window.renderLevelWithMenu === 'function') {
            window.renderLevelWithMenu();
        }
    };
    
    document.getElementById('globalDirBtn').onclick = function() {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        globalCardsFlipped = false;
        updateGlobalCardDisplay();
        document.getElementById('globalDirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        if (typeof window.saveProgress === 'function') window.saveProgress();
    };
    
    document.getElementById('globalCard').onclick = function() {
        if (globalCardsWords.length) {
            globalCardsFlipped = !globalCardsFlipped;
            updateGlobalCardDisplay();
        }
    };
    
    document.getElementById('globalStudyBtn').onclick = function() {
        if (globalCardsWords.length && globalCardsWords[globalCardsIndex]) {
            // Используем ту же функцию, что и в quizMode
            if (typeof window.markWordAsStudied === 'function') {
                window.markWordAsStudied(globalCardsWords[globalCardsIndex]);
            } else {
                // Fallback
                const word = globalCardsWords[globalCardsIndex];
                if (!window.wordsProgress) window.wordsProgress = {};
                if (!window.wordsProgress[window.currentLevel]) window.wordsProgress[window.currentLevel] = [];
                if (!window.wordsProgress[window.currentLevel].includes(word.de)) {
                    window.wordsProgress[window.currentLevel].push(word.de);
                    if (typeof window.saveProgress === 'function') window.saveProgress();
                }
            }
            globalCardsWords.splice(globalCardsIndex, 1);
            if (globalCardsIndex >= globalCardsWords.length) globalCardsIndex = 0;
            updateGlobalCardDisplay();
            updateGlobalCounter();
            if (typeof window.updateCounter === 'function') window.updateCounter();
        }
    };
    
    document.getElementById('globalContainerBtn').onclick = function() {
        const studied = getGlobalStudiedWords();
        if (!studied.length) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showGlobalWordsContainer(studied);
    };
    
    document.getElementById('globalSpeakBtn').onclick = function() {
        if (globalCardsWords[globalCardsIndex]) {
            if (typeof window.speak === 'function') {
                window.speak(globalCardsWords[globalCardsIndex].de);
            }
        }
    };
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (КАРУСЕЛЬ) ==========
function renderGlobalCardsMobile(container) {
    renderGlobalCardsDesktop(container);
    const wrapper = container.querySelector('.card');
    if (wrapper) {
        wrapper.style.maxWidth = '100%';
        wrapper.style.margin = '10px auto';
    }
}

// ========== КОНТЕЙНЕР ДЛЯ СЛОВ ==========
function getGlobalStudiedWords() {
    const level = window.currentLevel || 'A1';
    if (!window.wordsProgress) window.wordsProgress = {};
    if (!window.wordsProgress[level]) window.wordsProgress[level] = [];
    
    const allWords = globalCardsWords.length > 0 ? globalCardsWords : [];
    return allWords.filter(word => window.wordsProgress[level].includes(word.de));
}

function showGlobalWordsContainer(studiedWords) {
    if (typeof window.ContainerManager !== 'undefined' && window.ContainerManager.show) {
        window.ContainerManager.show({
            title: '📦 КОНТЕЙНЕР (' + studiedWords.length + ' слов)',
            items: studiedWords,
            emptyMessage: '📭 Контейнер пуст',
            itemTemplate: function(word) { return word.de + ' — ' + word.ru; },
            onReturnItem: function(wordId) {
                const level = window.currentLevel || 'A1';
                if (window.wordsProgress && window.wordsProgress[level]) {
                    const index = window.wordsProgress[level].indexOf(wordId);
                    if (index !== -1) {
                        window.wordsProgress[level].splice(index, 1);
                        if (typeof window.saveProgress === 'function') window.saveProgress();
                    }
                }
                const newStudied = getGlobalStudiedWords();
                if (newStudied.length === 0) {
                    const modal = document.getElementById('containerModal');
                    if (modal) modal.remove();
                    loadGlobalCards(globalCardsContainer, window.currentLevel);
                }
            },
            onReturnAll: function() {
                const level = window.currentLevel || 'A1';
                if (window.wordsProgress) {
                    window.wordsProgress[level] = [];
                    if (typeof window.saveProgress === 'function') window.saveProgress();
                }
                const modal = document.getElementById('containerModal');
                if (modal) modal.remove();
                loadGlobalCards(globalCardsContainer, window.currentLevel);
            }
        });
    } else {
        alert('📦 Контейнер (' + studiedWords.length + ' слов):\n\n' + 
              studiedWords.map(w => w.de + ' — ' + w.ru).join('\n'));
    }
}

// ========== ЭКСПОРТ ==========
window.loadGlobalCards = loadGlobalCards;
window.globalCardsWords = globalCardsWords;

console.log('🃏 cardsGlobal.js загружен');
