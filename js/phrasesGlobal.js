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

// ========== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ==========
async function loadGlobalPhrases(container, level) {
    // Защита от повторных загрузок
    if (globalPhrasesLoading) {
        console.log('⏳ Фразы уже загружаются, пропускаем...');
        return;
    }
    
    // Сохраняем контейнер
    if (container) {
        globalPhrasesContainer = container;
    } else {
        globalPhrasesContainer = document.getElementById('sectionContent');
        if (!globalPhrasesContainer) {
            console.error('❌ Контейнер #sectionContent не найден');
            return;
        }
    }
    
    globalPhrasesLoading = true;
    console.log('🔄 Начинаем загрузку фраз...');
    
    try {
        // Проверяем курс
        if (!window.courseData) {
            console.log('⏳ courseData ещё не загружен, пробуем подождать...');
            globalPhrasesContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка данных курса...</div>';
            
            let attempts = 0;
            while (!window.courseData && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.courseData) {
                globalPhrasesContainer.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#999;">
                        <div style="font-size:48px;margin-bottom:15px;">❌</div>
                        <div>Курс не загружен. Попробуйте выбрать уровень заново.</div>
                        <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
                    </div>
                `;
                return;
            }
        }
        
        globalPhrasesContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка всех фраз уровня...</div>';
        
        const allPhrases = await window.getAllPhrasesForLevel(level);
        
        if (!allPhrases || allPhrases.length === 0) {
            globalPhrasesContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Нет фраз для этого уровня</div>';
            return;
        }
        
        window.shuffleArray(allPhrases);
        globalPhrasesWords = allPhrases;
        globalPhrasesIndex = 0;
        globalPhrasesDirection = 'ru_to_de';
        globalPhrasesStudied = {};
        
        loadGlobalPhrasesProgress(level);
        
        // 👇 СНАЧАЛА СБРАСЫВАЕМ ФЛАГ, ПОТОМ ВЫЗЫВАЕМ РЕНДЕРИНГ
        console.log('✅ Данные загружены, вызываем рендеринг фраз...');
        globalPhrasesLoading = false;
        renderGlobalPhrases();
        globalPhrasesLoading = true;
        
    } catch(e) {
        console.error('❌ Ошибка загрузки фраз:', e);
        if (globalPhrasesContainer) {
            globalPhrasesContainer.innerHTML = `
                <div style="text-align:center;padding:40px;color:#999;">
                    <div style="font-size:48px;margin-bottom:15px;">❌</div>
                    <div>Ошибка загрузки фраз</div>
                    <div style="font-size:14px;margin-top:10px;">${e.message}</div>
                    <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
                </div>
            `;
        }
    } finally {
        globalPhrasesLoading = false;
        console.log('✅ Флаг загрузки фраз сброшен');
    }
}

// ========== ЗАГРУЗКА ПРОГРЕССА ==========
function loadGlobalPhrasesProgress(level) {
    try {
        const key = 'dm_global_phrases_progress_' + level;
        const saved = localStorage.getItem(key);
        if (saved) {
            globalPhrasesStudied = JSON.parse(saved);
        } else {
            globalPhrasesStudied = {};
        }
    } catch(e) {
        globalPhrasesStudied = {};
    }
}

// ========== СОХРАНЕНИЕ ПРОГРЕССА ==========
function saveGlobalPhrasesProgress(level) {
    try {
        const key = 'dm_global_phrases_progress_' + level;
        localStorage.setItem(key, JSON.stringify(globalPhrasesStudied));
    } catch(e) {
        console.warn('Ошибка сохранения прогресса фраз:', e);
    }
}

// ========== ОТОБРАЖЕНИЕ ФРАЗ ==========
function renderGlobalPhrases() {
    const container = globalPhrasesContainer;
    if (!container) {
        console.error('❌ Нет контейнера для рендеринга фраз');
        const newContainer = document.getElementById('sectionContent');
        if (newContainer) {
            globalPhrasesContainer = newContainer;
            console.log('✅ Контейнер найден заново');
            renderGlobalPhrases();
            return;
        }
        return;
    }
    
    console.log('🎨 Рендеринг фраз, всего:', globalPhrasesWords.length);
    
    if (!globalPhrasesWords || globalPhrasesWords.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Нет фраз для отображения</div>';
        return;
    }
    
    const availablePhrases = globalPhrasesWords.filter(p => {
        const key = p.de + '|' + p.ru;
        return !globalPhrasesStudied[key];
    });
    
    if (availablePhrases.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="font-size:64px;margin-bottom:20px;">🎉</div>
                <div style="font-size:24px;margin-bottom:20px;">Все фразы изучены!</div>
                <button onclick="window.renderLevelWithMenu()" style="padding:10px 30px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
        return;
    }
    
    const currentPhrase = availablePhrases[globalPhrasesIndex % availablePhrases.length];
    if (!currentPhrase) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">❌ Ошибка загрузки фразы</div>';
        return;
    }
    
    const isRuToDe = globalPhrasesDirection === 'ru_to_de';
    const deWords = currentPhrase.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = currentPhrase.ru.replace(/[.,!?;:]/g, '').split(/\s+/);
    
    const allWordsForPhrase = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true,
        originalIndex: i
    }));
    
    const distractors = getDistractorsForPhrase(deWords, 8);
    const allWordsForChoice = [...allWordsForPhrase, ...distractors];
    window.shuffleArray(allWordsForChoice);
    
    globalPhrasesSelected = [];
    globalPhrasesAvailable = allWordsForChoice;
    globalPhrasesActive = {};
    globalPhrasesAvailable.forEach(w => { globalPhrasesActive[w.display] = true; });
    globalPhrasesHintIndex = 0;
    
    const questionText = isRuToDe ? currentPhrase.ru : currentPhrase.de;
    const hasWords = globalPhrasesSelected.length > 0;
    const displayText = globalPhrasesSelected.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
    const textColor = hasWords ? '#1A1A1A' : '#CCCCCC';
    
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:15px;">
                <button id="globalPhrasesDirBtn" style="background:#3B6FE0; color:white; padding:6px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">
                    ${isRuToDe ? 'Ru → De' : 'De → Ru'}
                </button>
                <button id="globalPhrasesShuffleBtn" style="background:#FF9800; color:white; padding:6px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">
                    🔄 ПЕРЕМЕШАТЬ
                </button>
                <button id="globalPhrasesBackBtn" style="background:#E8F0FE; padding:6px 14px; border:2px solid #D0D0D0; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px;">
                    ← НАЗАД
                </button>
            </div>
            
            <div style="background:#E8F0FE; border-radius:20px; padding:20px; margin-bottom:15px;">
                <div style="font-size:14px; color:#666; margin-bottom:5px;">${isRuToDe ? 'Составьте предложение на немецком:' : 'Составьте предложение на русском:'}</div>
                <div style="font-size:20px; font-weight:bold;">${questionText}</div>
            </div>
            
            <div style="background:#FFFFFF; border:2px solid #E0E0E0; border-radius:16px; padding:15px; margin:10px 0; text-align:center; font-size:20px; min-height:60px; color:${textColor};" id="globalPhrasesResult">
                ${displayText}
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; max-width:700px; margin:15px auto;" id="globalPhrasesWordsContainer">
                ${globalPhrasesAvailable.map(word => `
                    <button class="word-btn" data-word="${word.display}" style="padding:10px 8px; font-size:13px; text-align:center; min-height:44px; display:flex; align-items:center; justify-content:center; border-radius:40px; ${!globalPhrasesActive[word.display] ? 'opacity:0.4; pointer-events:none;' : ''}">
                        ${word.display}
                    </button>
                `).join('')}
            </div>
            
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:10px 0;">
                <button class="ctrl-btn" id="globalPhrasesUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="globalPhrasesResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn" id="globalPhrasesCheckBtn" style="background:#3B6FE0 !important; color:white !important; border-color:#2B5BC7 !important;">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="globalPhrasesSpeakBtn">🔊 ОЗВУЧИТЬ</button>
            </div>
            
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:10px 0;">
                <button class="ctrl-btn" id="globalPhrasesHintBtn">💡 ПОДСКАЗКА</button>
                <div style="background:#FFFFFF; border:2px solid #E0E0E0; border-radius:12px; padding:8px 16px; flex:1; min-width:150px; font-size:13px; color:#3B6FE0; font-weight:bold; text-align:center; min-height:40px;" id="globalPhrasesHintLabel"></div>
            </div>
            
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin:10px 0;">
                <button class="ctrl-btn" id="globalPhrasesStudyBtn" style="background:#4CAF50; color:white; border:none;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="globalPhrasesContainerBtn" style="background:#FF9800; color:white; border:none;">📦 В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="globalPhrasesPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="globalPhrasesNextBtn">ВПЕРЕД ▶</button>
                <div style="font-size:14px; color:#888; display:flex; align-items:center; margin-left:10px;">${globalPhrasesIndex + 1} / ${availablePhrases.length}</div>
            </div>
        </div>
    `;
    
    // ===== ОБРАБОТЧИКИ =====
    
    document.querySelectorAll('#globalPhrasesWordsContainer .word-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const word = this.getAttribute('data-word');
            if (globalPhrasesActive[word]) {
                globalPhrasesActive[word] = false;
                const foundWord = globalPhrasesAvailable.find(w => w.display === word);
                if (foundWord) {
                    globalPhrasesSelected.push(foundWord);
                    updateGlobalPhrasesDisplay(container);
                }
            }
        });
    });
    
    document.getElementById('globalPhrasesDirBtn').addEventListener('click', function() {
        globalPhrasesDirection = globalPhrasesDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
        this.textContent = globalPhrasesDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
        renderGlobalPhrases();
    });
    
    document.getElementById('globalPhrasesShuffleBtn').addEventListener('click', function() {
        const available = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return !globalPhrasesStudied[key];
        });
        window.shuffleArray(available);
        globalPhrasesWords = available;
        globalPhrasesIndex = 0;
        renderGlobalPhrases();
    });
    
    document.getElementById('globalPhrasesBackBtn').addEventListener('click', function() {
        if (typeof window.renderLevelWithMenu === 'function') {
            window.renderLevelWithMenu();
        }
    });
    
    document.getElementById('globalPhrasesUndoBtn').addEventListener('click', function() {
        if (globalPhrasesSelected.length > 0) {
            const lastWord = globalPhrasesSelected.pop();
            globalPhrasesActive[lastWord.display] = true;
            updateGlobalPhrasesDisplay(container);
        }
    });
    
    document.getElementById('globalPhrasesResetBtn').addEventListener('click', function() {
        globalPhrasesSelected = [];
        globalPhrasesAvailable.forEach(w => { globalPhrasesActive[w.display] = true; });
        updateGlobalPhrasesDisplay(container);
        document.getElementById('globalPhrasesHintLabel').textContent = '';
        globalPhrasesHintIndex = 0;
    });
    
    document.getElementById('globalPhrasesCheckBtn').addEventListener('click', function() {
        if (globalPhrasesSelected.length === 0) {
            const result = document.getElementById('globalPhrasesResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }
        
        const userAnswer = globalPhrasesSelected.map(w => w.display).join(' ');
        const result = document.getElementById('globalPhrasesResult');
        const correctAnswer = isRuToDe ? currentPhrase.de : currentPhrase.ru;
        
        const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
        const normalizedCorrect = correctAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
        
        if (normalizedUser === normalizedCorrect) {
            result.style.backgroundColor = '#C8E6C9';
            result.textContent = '✅ ПРАВИЛЬНО!';
            
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                globalPhrasesIndex++;
                renderGlobalPhrases();
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            result.textContent = '❌ Неправильно. Попробуйте снова.';
            
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                globalPhrasesSelected.forEach(w => { globalPhrasesActive[w.display] = true; });
                globalPhrasesSelected = [];
                updateGlobalPhrasesDisplay(container);
                const hasWords = globalPhrasesSelected.length > 0;
                const displayText = globalPhrasesSelected.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
                result.textContent = displayText;
                result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
            }, 800);
        }
    });
    
    document.getElementById('globalPhrasesSpeakBtn').addEventListener('click', function() {
        if (typeof window.speak === 'function') {
            window.speak(currentPhrase.de);
        }
    });
    
    document.getElementById('globalPhrasesHintBtn').addEventListener('click', function() {
        const hintLabel = document.getElementById('globalPhrasesHintLabel');
        const hintWords = deWords;
        if (globalPhrasesHintIndex < hintWords.length) {
            const currentHint = hintWords.slice(0, globalPhrasesHintIndex + 1).join(' ');
            hintLabel.textContent = '💡 ' + currentHint;
            globalPhrasesHintIndex++;
        } else {
            hintLabel.textContent = '💡 Полное предложение: ' + hintWords.join(' ');
        }
    });
    
    document.getElementById('globalPhrasesStudyBtn').addEventListener('click', function() {
        const key = currentPhrase.de + '|' + currentPhrase.ru;
        globalPhrasesStudied[key] = true;
        saveGlobalPhrasesProgress(window.currentLevel);
        
        const available = globalPhrasesWords.filter(p => {
            const k = p.de + '|' + p.ru;
            return !globalPhrasesStudied[k];
        });
        
        if (available.length === 0) {
            renderGlobalPhrases();
            return;
        }
        
        globalPhrasesWords = available;
        if (globalPhrasesIndex >= globalPhrasesWords.length) {
            globalPhrasesIndex = 0;
        }
        renderGlobalPhrases();
    });
    
    document.getElementById('globalPhrasesContainerBtn').addEventListener('click', function() {
        const studied = getGlobalPhrasesStudied();
        if (!studied.length) {
            alert('📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.');
            return;
        }
        showGlobalPhrasesContainer(studied);
    });
    
    document.getElementById('globalPhrasesPrevBtn').addEventListener('click', function() {
        const available = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return !globalPhrasesStudied[key];
        });
        if (globalPhrasesIndex > 0) {
            globalPhrasesIndex--;
            renderGlobalPhrases();
        }
    });
    
    document.getElementById('globalPhrasesNextBtn').addEventListener('click', function() {
        const available = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return !globalPhrasesStudied[key];
        });
        if (globalPhrasesIndex + 1 < available.length) {
            globalPhrasesIndex++;
            renderGlobalPhrases();
        }
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function getDistractorsForPhrase(deWords, count) {
    const distractors = [];
    const allWords = [];
    
    for (const phrase of globalPhrasesWords) {
        const words = phrase.de.split(/\s+/);
        for (const w of words) {
            const clean = w.replace(/[.,!?;:]/g, '').toLowerCase();
            if (clean.length > 2 && !deWords.includes(clean)) {
                allWords.push(clean);
            }
        }
    }
    
    const unique = [...new Set(allWords)];
    window.shuffleArray(unique);
    
    for (let i = 0; i < Math.min(count, unique.length); i++) {
        if (unique[i]) {
            distractors.push({
                display: unique[i],
                de: unique[i],
                ru: unique[i],
                isCorrect: false,
                originalIndex: -1
            });
        }
    }
    
    return distractors;
}

function updateGlobalPhrasesDisplay(container) {
    const result = document.getElementById('globalPhrasesResult');
    const wordsContainer = document.getElementById('globalPhrasesWordsContainer');
    
    if (result) {
        const hasWords = globalPhrasesSelected.length > 0;
        const displayText = globalPhrasesSelected.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.backgroundColor = '#FFFFFF';
    }
    
    if (wordsContainer) {
        wordsContainer.innerHTML = '';
        globalPhrasesAvailable.forEach(word => {
            const isActive = globalPhrasesActive[word.display];
            const btn = document.createElement('button');
            btn.className = 'word-btn';
            btn.textContent = word.display;
            btn.style.cssText = isActive 
                ? 'padding:10px 8px; font-size:13px; text-align:center; min-height:44px; display:flex; align-items:center; justify-content:center; background:#E8F0FE; border:2px solid #D0D0D0; border-radius:40px; cursor:pointer;'
                : 'padding:10px 8px; font-size:13px; text-align:center; min-height:44px; display:flex; align-items:center; justify-content:center; background:#E8F0FE; border:2px solid #D0D0D0; border-radius:40px; cursor:default; opacity:0.4; pointer-events:none;';
            if (isActive) {
                btn.addEventListener('click', function() {
                    if (globalPhrasesActive[word.display]) {
                        globalPhrasesActive[word.display] = false;
                        const foundWord = globalPhrasesAvailable.find(w => w.display === word.display);
                        if (foundWord) {
                            globalPhrasesSelected.push(foundWord);
                            updateGlobalPhrasesDisplay(container);
                        }
                    }
                });
            }
            wordsContainer.appendChild(btn);
        });
    }
}

// ========== КОНТЕЙНЕР ДЛЯ ФРАЗ ==========
function getGlobalPhrasesStudied() {
    const level = window.currentLevel || 'A1';
    return globalPhrasesWords.filter(p => {
        const key = p.de + '|' + p.ru;
        return globalPhrasesStudied[key];
    });
}

function showGlobalPhrasesContainer(studiedPhrases) {
    if (typeof window.ContainerManager !== 'undefined' && window.ContainerManager.show) {
        window.ContainerManager.show({
            title: '📦 КОНТЕЙНЕР (' + studiedPhrases.length + ' фраз)',
            items: studiedPhrases,
            emptyMessage: '📭 Контейнер пуст',
            itemTemplate: function(p) { return p.de + ' — ' + p.ru; },
            onReturnItem: function(phraseId) {
                const key = phraseId;
                if (globalPhrasesStudied[key]) {
                    delete globalPhrasesStudied[key];
                    saveGlobalPhrasesProgress(window.currentLevel);
                }
                const newStudied = getGlobalPhrasesStudied();
                if (newStudied.length === 0) {
                    const modal = document.getElementById('containerModal');
                    if (modal) modal.remove();
                    loadGlobalPhrases(globalPhrasesContainer, window.currentLevel);
                }
            },
            onReturnAll: function() {
                globalPhrasesStudied = {};
                saveGlobalPhrasesProgress(window.currentLevel);
                const modal = document.getElementById('containerModal');
                if (modal) modal.remove();
                loadGlobalPhrases(globalPhrasesContainer, window.currentLevel);
            }
        });
    } else {
        alert('📦 Контейнер (' + studiedPhrases.length + ' фраз):\n\n' + 
              studiedPhrases.map(p => p.de + ' — ' + p.ru).join('\n'));
    }
}

// ========== ЭКСПОРТ ==========
window.loadGlobalPhrases = loadGlobalPhrases;
window.globalPhrasesWords = globalPhrasesWords;
window.renderGlobalPhrases = renderGlobalPhrases;

console.log('🧩 phrasesGlobal.js загружен');
