// phrasesGlobal.js — глобальные фразы для всех фраз уровня

let globalPhrasesWords = [];
let globalPhrasesIndex = 0;
let globalPhrasesContainer = null;
let globalPhrasesDirection = 'ru_to_de';
let globalPhrasesStudied = {};
let globalPhrasesSelected = [];
let globalPhrasesAvailable = [];
let globalPhrasesActive = {};
let globalPhrasesHintIndex = 0;

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
async function loadGlobalPhrases(container, level) {
    console.log('🔄 loadGlobalPhrases вызван, уровень:', level);
    
    globalPhrasesContainer = container || document.getElementById('sectionContent');
    if (!globalPhrasesContainer) {
        console.error('❌ Контейнер не найден');
        return;
    }
    
    // Ждем загрузки курса
    let attempts = 0;
    while (!window.courseData && attempts < 15) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
        console.log(`⏳ Ожидание courseData для фраз... попытка ${attempts}`);
    }
    
    if (!window.courseData) {
        globalPhrasesContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">⏳</div>
                <div>Данные курса загружаются. Попробуйте обновить страницу.</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
        return;
    }
    
    globalPhrasesContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">🔄 Загрузка фраз...</div>';
    
    try {
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
        
        // Загружаем прогресс
        const key = 'dm_global_phrases_progress_' + level;
        try {
            const saved = localStorage.getItem(key);
            if (saved) globalPhrasesStudied = JSON.parse(saved);
        } catch(e) {}
        
        renderGlobalPhrases();
        
    } catch(e) {
        console.error('❌ Ошибка:', e);
        globalPhrasesContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">❌</div>
                <div>Ошибка: ${e.message}</div>
                <button onclick="window.renderLevelWithMenu()" style="margin-top:15px;padding:10px 20px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
    }
}

// ========== РЕНДЕРИНГ ==========
function renderGlobalPhrases() {
    const container = globalPhrasesContainer;
    if (!container) {
        console.error('❌ Нет контейнера');
        return;
    }
    
    console.log('🎨 Рендеринг фраз, всего:', globalPhrasesWords.length);
    
    const available = globalPhrasesWords.filter(p => {
        const key = p.de + '|' + p.ru;
        return !globalPhrasesStudied[key];
    });
    
    if (available.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="font-size:64px;margin-bottom:20px;">🎉</div>
                <div style="font-size:24px;margin-bottom:20px;">Все фразы изучены!</div>
                <button onclick="window.renderLevelWithMenu()" style="padding:10px 30px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;">← Назад</button>
            </div>
        `;
        return;
    }
    
    const current = available[globalPhrasesIndex % available.length];
    if (!current) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">❌ Ошибка</div>';
        return;
    }
    
    const isRuToDe = globalPhrasesDirection === 'ru_to_de';
    const deWords = current.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = current.ru.replace(/[.,!?;:]/g, '').split(/\s+/);
    
    // Слова для сборки
    const correctWords = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true
    }));
    
    // Дистракторы
    const distractors = [];
    const allWordsSet = new Set();
    for (const p of globalPhrasesWords) {
        const words = p.de.split(/\s+/);
        for (const w of words) {
            const clean = w.replace(/[.,!?;:]/g, '').toLowerCase();
            if (clean.length > 2 && !deWords.includes(clean)) {
                allWordsSet.add(clean);
            }
        }
    }
    const distractorList = Array.from(allWordsSet);
    window.shuffleArray(distractorList);
    for (let i = 0; i < Math.min(8, distractorList.length); i++) {
        distractors.push({
            display: distractorList[i],
            de: distractorList[i],
            ru: distractorList[i],
            isCorrect: false
        });
    }
    
    const allWords = [...correctWords, ...distractors];
    window.shuffleArray(allWords);
    
    globalPhrasesSelected = [];
    globalPhrasesAvailable = allWords;
    globalPhrasesActive = {};
    allWords.forEach(w => { globalPhrasesActive[w.display] = true; });
    globalPhrasesHintIndex = 0;
    
    const displayText = globalPhrasesSelected.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
    
    container.innerHTML = `
        <div style="text-align:center;">
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-bottom:15px;">
                <button id="phrasesDirBtn" style="background:#3B6FE0;color:white;padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">${isRuToDe ? 'Ru → De' : 'De → Ru'}</button>
                <button id="phrasesShuffleBtn" style="background:#FF9800;color:white;padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">🔄 ПЕРЕМЕШАТЬ</button>
                <button id="phrasesBackBtn" style="background:#E8F0FE;padding:6px 14px;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;">← НАЗАД</button>
            </div>
            
            <div style="background:#E8F0FE;border-radius:20px;padding:20px;margin-bottom:15px;">
                <div style="font-size:14px;color:#666;margin-bottom:5px;">${isRuToDe ? 'Составьте предложение на немецком:' : 'Составьте предложение на русском:'}</div>
                <div style="font-size:20px;font-weight:bold;">${isRuToDe ? current.ru : current.de}</div>
            </div>
            
            <div id="phrasesResult" style="background:#FFFFFF;border:2px solid #E0E0E0;border-radius:16px;padding:15px;margin:10px 0;text-align:center;font-size:20px;min-height:60px;color:#1A1A1A;">
                ${displayText}
            </div>
            
            <div id="phrasesWordsContainer" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:700px;margin:15px auto;">
                ${allWords.map(word => `
                    <button class="word-btn" data-word="${word.display}" style="padding:10px 8px;font-size:13px;text-align:center;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:40px;background:#E8F0FE;border:2px solid #D0D0D0;cursor:pointer;${!globalPhrasesActive[word.display] ? 'opacity:0.4;pointer-events:none;' : ''}">
                        ${word.display}
                    </button>
                `).join('')}
            </div>
            
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0;">
                <button class="ctrl-btn" id="phrasesUndoBtn">↩️ ВЕРНУТЬ</button>
                <button class="ctrl-btn" id="phrasesResetBtn">🔄 СБРОСИТЬ</button>
                <button class="ctrl-btn" id="phrasesCheckBtn" style="background:#3B6FE0 !important;color:white !important;">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="phrasesSpeakBtn">🔊 ОЗВУЧИТЬ</button>
                <button class="ctrl-btn" id="phrasesHintBtn">💡 ПОДСКАЗКА</button>
            </div>
            
            <div id="phrasesHintLabel" style="background:#FFFFFF;border:2px solid #E0E0E0;border-radius:12px;padding:8px 16px;margin:10px auto;max-width:500px;font-size:13px;color:#3B6FE0;font-weight:bold;text-align:center;min-height:40px;"></div>
            
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0;">
                <button class="ctrl-btn" id="phrasesStudyBtn" style="background:#4CAF50;color:white;border:none;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="phrasesContainerBtn" style="background:#FF9800;color:white;border:none;">📦 В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="phrasesPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="phrasesNextBtn">ВПЕРЕД ▶</button>
                <div style="font-size:14px;color:#888;display:flex;align-items:center;">${globalPhrasesIndex + 1} / ${available.length}</div>
            </div>
        </div>
    `;
    
    // ===== ОБРАБОТЧИКИ =====
    
    // Слова
    document.querySelectorAll('#phrasesWordsContainer .word-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const word = this.getAttribute('data-word');
            if (globalPhrasesActive[word]) {
                globalPhrasesActive[word] = false;
                const found = globalPhrasesAvailable.find(w => w.display === word);
                if (found) {
                    globalPhrasesSelected.push(found);
                    updatePhrasesDisplay();
                }
            }
        });
    });
    
    document.getElementById('phrasesDirBtn').onclick = function() {
        globalPhrasesDirection = globalPhrasesDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
        this.textContent = globalPhrasesDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
        renderGlobalPhrases();
    };
    
    document.getElementById('phrasesShuffleBtn').onclick = function() {
        const available2 = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return !globalPhrasesStudied[key];
        });
        window.shuffleArray(available2);
        globalPhrasesWords = available2;
        globalPhrasesIndex = 0;
        renderGlobalPhrases();
    };
    
    document.getElementById('phrasesBackBtn').onclick = function() {
        if (typeof window.renderLevelWithMenu === 'function') window.renderLevelWithMenu();
    };
    
    document.getElementById('phrasesUndoBtn').onclick = function() {
        if (globalPhrasesSelected.length > 0) {
            const last = globalPhrasesSelected.pop();
            globalPhrasesActive[last.display] = true;
            updatePhrasesDisplay();
        }
    };
    
    document.getElementById('phrasesResetBtn').onclick = function() {
        globalPhrasesSelected = [];
        globalPhrasesAvailable.forEach(w => { globalPhrasesActive[w.display] = true; });
        updatePhrasesDisplay();
        document.getElementById('phrasesHintLabel').textContent = '';
        globalPhrasesHintIndex = 0;
    };
    
    document.getElementById('phrasesCheckBtn').onclick = function() {
        if (globalPhrasesSelected.length === 0) {
            const result = document.getElementById('phrasesResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }
        
        const userAnswer = globalPhrasesSelected.map(w => w.display).join(' ');
        const result = document.getElementById('phrasesResult');
        const correctAnswer = isRuToDe ? current.de : current.ru;
        
        const normUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
        const normCorrect = correctAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
        
        if (normUser === normCorrect) {
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
                updatePhrasesDisplay();
                const displayText2 = globalPhrasesSelected.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
                result.textContent = displayText2;
                result.style.color = '#1A1A1A';
            }, 800);
        }
    };
    
    document.getElementById('phrasesSpeakBtn').onclick = function() {
        if (typeof window.speak === 'function') window.speak(current.de);
    };
    
    document.getElementById('phrasesHintBtn').onclick = function() {
        const hintLabel = document.getElementById('phrasesHintLabel');
        const hintWords = deWords;
        if (globalPhrasesHintIndex < hintWords.length) {
            const hint = hintWords.slice(0, globalPhrasesHintIndex + 1).join(' ');
            hintLabel.textContent = '💡 ' + hint;
            globalPhrasesHintIndex++;
        } else {
            hintLabel.textContent = '💡 Полное предложение: ' + hintWords.join(' ');
        }
    };
    
    document.getElementById('phrasesStudyBtn').onclick = function() {
        const key = current.de + '|' + current.ru;
        globalPhrasesStudied[key] = true;
        const level = window.currentLevel || 'A1';
        localStorage.setItem('dm_global_phrases_progress_' + level, JSON.stringify(globalPhrasesStudied));
        
        const available2 = globalPhrasesWords.filter(p => {
            const k = p.de + '|' + p.ru;
            return !globalPhrasesStudied[k];
        });
        
        if (available2.length === 0) {
            renderGlobalPhrases();
            return;
        }
        globalPhrasesWords = available2;
        if (globalPhrasesIndex >= globalPhrasesWords.length) globalPhrasesIndex = 0;
        renderGlobalPhrases();
    };
    
    document.getElementById('phrasesContainerBtn').onclick = function() {
        const studied = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return globalPhrasesStudied[key];
        });
        if (!studied.length) {
            alert('📦 Контейнер пуст');
            return;
        }
        showPhrasesContainer(studied);
    };
    
    document.getElementById('phrasesPrevBtn').onclick = function() {
        const available2 = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return !globalPhrasesStudied[key];
        });
        if (globalPhrasesIndex > 0) {
            globalPhrasesIndex--;
            renderGlobalPhrases();
        }
    };
    
    document.getElementById('phrasesNextBtn').onclick = function() {
        const available2 = globalPhrasesWords.filter(p => {
            const key = p.de + '|' + p.ru;
            return !globalPhrasesStudied[key];
        });
        if (globalPhrasesIndex + 1 < available2.length) {
            globalPhrasesIndex++;
            renderGlobalPhrases();
        }
    };
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function updatePhrasesDisplay() {
    const result = document.getElementById('phrasesResult');
    const container = document.getElementById('phrasesWordsContainer');
    
    if (result) {
        const displayText = globalPhrasesSelected.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = globalPhrasesSelected.length > 0 ? '#1A1A1A' : '#CCCCCC';
        result.style.backgroundColor = '#FFFFFF';
    }
    
    if (container) {
        container.innerHTML = '';
        globalPhrasesAvailable.forEach(word => {
            const isActive = globalPhrasesActive[word.display];
            const btn = document.createElement('button');
            btn.className = 'word-btn';
            btn.textContent = word.display;
            btn.style.cssText = isActive 
                ? 'padding:10px 8px;font-size:13px;text-align:center;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:40px;background:#E8F0FE;border:2px solid #D0D0D0;cursor:pointer;'
                : 'padding:10px 8px;font-size:13px;text-align:center;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:40px;background:#E8F0FE;border:2px solid #D0D0D0;cursor:default;opacity:0.4;pointer-events:none;';
            if (isActive) {
                btn.addEventListener('click', function() {
                    const word2 = this.getAttribute('data-word');
                    if (globalPhrasesActive[word2]) {
                        globalPhrasesActive[word2] = false;
                        const found = globalPhrasesAvailable.find(w => w.display === word2);
                        if (found) {
                            globalPhrasesSelected.push(found);
                            updatePhrasesDisplay();
                        }
                    }
                });
            }
            container.appendChild(btn);
        });
    }
}

function showPhrasesContainer(studiedPhrases) {
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
                    const level = window.currentLevel || 'A1';
                    localStorage.setItem('dm_global_phrases_progress_' + level, JSON.stringify(globalPhrasesStudied));
                }
                const modal = document.getElementById('containerModal');
                if (modal) modal.remove();
                loadGlobalPhrases(globalPhrasesContainer, window.currentLevel);
            },
            onReturnAll: function() {
                globalPhrasesStudied = {};
                const level = window.currentLevel || 'A1';
                localStorage.setItem('dm_global_phrases_progress_' + level, JSON.stringify(globalPhrasesStudied));
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

console.log('🧩 phrasesGlobal.js загружен (исправленная версия)');
