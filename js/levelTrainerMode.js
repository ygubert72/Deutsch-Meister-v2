// ====================================================================
// levelTrainerMode.js — Тренажёр "Все фразы уровня" (6 КНОПОК)
// ====================================================================

let levelTrainerSentences = [];
let levelTrainerIndex = 0;
let levelTrainerCurrentSentence = null;
let levelTrainerSelectedWords = [];
let levelTrainerAvailableWords = [];
let levelTrainerActiveWords = {};
let levelTrainerHintIndex = 0;
let levelTrainerHintWords = [];
let levelTrainerDirection = 'ru_to_de';
let levelTrainerStudied = {};
let levelTrainerCurrentLevel = 'A1';
let levelTrainerAllPhrases = [];
let levelTrainerVocabCache = {};

// ===== СОСТОЯНИЕ ДЛЯ 6 КНОПОК =====
let _visibleWords = [];
let _wordQueue = [];
let _distractorPool = [];
let _selectedWords = [];
let _currentPhraseWords = [];
let _isShortPhrase = false;

// ===== КЕШ =====
let _cachedDistractors = null;
let _cachedLevel = null;
let _cachedDirection = null;

// ===== КЕШ ФРАЗ =====
function getCachedPhrases(level) {
    try {
        const cache = JSON.parse(localStorage.getItem('dm_phrases_cache') || '{}');
        if (cache[level] && cache[level].version) {
            const currentVersion = window.getContentVersion ? window.getContentVersion() : '1.0';
            if (cache[level].version === currentVersion) {
                return cache[level].data;
            }
            delete cache[level];
            localStorage.setItem('dm_phrases_cache', JSON.stringify(cache));
        }
    } catch(e) {}
    return null;
}

function cachePhrases(level, data) {
    try {
        const cache = JSON.parse(localStorage.getItem('dm_phrases_cache') || '{}');
        cache[level] = {
            data: data,
            version: window.getContentVersion ? window.getContentVersion() : '1.0',
            timestamp: Date.now()
        };
        localStorage.setItem('dm_phrases_cache', JSON.stringify(cache));
    } catch(e) {
        console.warn('⚠️ Ошибка сохранения кеша фраз:', e);
    }
}

// ========== ЗАГРУЗКА ВСЕХ ФРАЗ УРОВНЯ ==========
async function loadAllPhrasesForLevel(level) {
    const cached = getCachedPhrases(level);
    if (cached) {
        console.log(`📚 Используем кеш для фраз уровня ${level}`);
        return cached;
    }
    
    try {
        const response = await fetch(`docs/${level}/all_phrases.json`);
        if (!response.ok) {
            throw new Error(`Файл docs/${level}/all_phrases.json не найден`);
        }
        const allPhrases = await response.json();
        console.log(`📚 Загружено ${allPhrases.length} фраз для уровня ${level}`);
        cachePhrases(level, allPhrases);
        return allPhrases;
    } catch(e) {
        console.error('❌ Ошибка загрузки all_phrases.json:', e);
        return await loadAllPhrasesLegacy(level);
    }
}

// ========== СТАРЫЙ СПОСОБ (запасной) ==========
async function loadAllPhrasesLegacy(level) {
    try {
        const indexResponse = await fetch(`docs/${level}/index.json`);
        if (!indexResponse.ok) throw new Error('Не удалось загрузить индекс уровня');
        const indexData = await indexResponse.json();
        let allPhrases = [];
        const seen = new Set();
        for (const lesson of indexData.lessons) {
            const lessonId = lesson.id;
            const lessonFile = `docs/${level}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            try {
                const response = await fetch(lessonFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.trainer && Array.isArray(data.trainer)) {
                        for (const phrase of data.trainer) {
                            const key = phrase.de + '|' + phrase.ru;
                            if (!seen.has(key)) {
                                seen.add(key);
                                allPhrases.push(phrase);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        console.log(`📚 Загружено ${allPhrases.length} фраз для уровня ${level} (по-старому)`);
        cachePhrases(level, allPhrases);
        return allPhrases;
    } catch(e) {
        console.error('❌ Ошибка загрузки фраз уровня:', e);
        return [];
    }
}

// ========== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ==========
async function loadAllVocabularyForLevelTrainer(level) {
    if (levelTrainerVocabCache[level]) {
        return levelTrainerVocabCache[level];
    }
    
    try {
        const response = await fetch(`docs/${level}.json`);
        if (!response.ok) {
            throw new Error(`Файл docs/${level}.json не найден`);
        }
        const allWords = await response.json();
        levelTrainerVocabCache[level] = allWords;
        console.log(`📚 Загружено ${allWords.length} слов для уровня ${level}`);
        return allWords;
    } catch(e) {
        console.error('❌ Ошибка загрузки слов уровня:', e);
        return [];
    }
}

// ========== ЗАГРУЗКА/СОХРАНЕНИЕ КОНТЕЙНЕРА ==========
function loadLevelTrainerStudied(level) {
    const key = 'dm_level_trainer_studied_' + level;
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            levelTrainerStudied = JSON.parse(saved);
        } else {
            levelTrainerStudied = {};
        }
    } catch(e) {
        levelTrainerStudied = {};
    }
}

function saveLevelTrainerStudied(level) {
    const key = 'dm_level_trainer_studied_' + level;
    try {
        localStorage.setItem(key, JSON.stringify(levelTrainerStudied));
    } catch(e) {
        console.warn('⚠️ Ошибка сохранения контейнера фраз уровня:', e);
    }
}

function getLevelTrainerStudiedList() {
    if (!levelTrainerAllPhrases) return [];
    return levelTrainerAllPhrases.filter(phrase => {
        const key = phrase.de + '|' + phrase.ru;
        return levelTrainerStudied[key] === true;
    });
}

function updateLevelTrainerPhrases() {
    let availablePhrases = levelTrainerAllPhrases.filter(phrase => {
        const key = phrase.de + '|' + phrase.ru;
        return !levelTrainerStudied[key];
    });
    if (availablePhrases.length === 0 && levelTrainerAllPhrases.length > 0) {
        availablePhrases = [...levelTrainerAllPhrases];
    }
    levelTrainerSentences = availablePhrases;
    if (levelTrainerIndex >= levelTrainerSentences.length && levelTrainerSentences.length > 0) {
        levelTrainerIndex = 0;
    }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
window.loadAllPhrasesMode = async function(level) {
    console.log('🔄 loadAllPhrasesMode (6 кнопок) вызван для уровня:', level);
    levelTrainerCurrentLevel = level;
    levelTrainerVocabCache = {};
    _cachedDistractors = null;
    _cachedLevel = null;
    _cachedDirection = null;
    
    loadLevelTrainerStudied(level);
    levelTrainerAllPhrases = await loadAllPhrasesForLevel(level);
    console.log('📚 Всего фраз в уровне:', levelTrainerAllPhrases.length);
    if (levelTrainerAllPhrases.length === 0) {
        showLevelTrainerEmpty();
        return;
    }
    const vocab = await loadAllVocabularyForLevelTrainer(level);
    levelTrainerVocabCache[level] = vocab;
    updateLevelTrainerPhrases();
    levelTrainerIndex = 0;
    levelTrainerDirection = 'ru_to_de';
    
    if (levelTrainerSentences.length > 0) {
        levelTrainerCurrentSentence = levelTrainerSentences[0];
    }
    
    showLevelTrainerInterface();
};

// ========== ПОКАЗАТЬ, ЧТО ФРАЗ НЕТ ==========
function showLevelTrainerEmpty() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
            <div>Нет фраз для уровня ${levelTrainerCurrentLevel}</div>
            <button class="back-btn" onclick="renderLevel()" style="margin-top: 20px;">← НАЗАД</button>
        </div>
    `;
    document.getElementById('modeIndicator').textContent = `🧩 Все фразы уровня ${levelTrainerCurrentLevel}`;
    updateCounter();
}

// ========== ПОКАЗАТЬ ВСЁ ИЗУЧЕНО ==========
function showLevelTrainerAllStudied() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
            <button class="back-btn" onclick="renderLevel()" style="padding: 8px 16px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                ← НАЗАД
            </button>
        </div>
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
            <div style="font-size: 24px; margin-bottom: 20px;">Все фразы уровня ${levelTrainerCurrentLevel} изучены!</div>
            <div style="font-size: 16px; margin-bottom: 20px;">Отличная работа! Вы выучили все фразы этого уровня.</div>
            <button class="ctrl-btn" onclick="location.reload()" style="padding: 10px 30px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 НАЧАТЬ ЗАНОВО</button>
        </div>
    `;
    document.getElementById('modeIndicator').textContent = `🧩 Все фразы уровня ${levelTrainerCurrentLevel}`;
    updateCounter();
}

// ========== ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ФРАЗЫ ==========
function initializePhraseState() {
    const isRuToDe = levelTrainerDirection === 'ru_to_de';
    const targetText = isRuToDe ? levelTrainerCurrentSentence.de : levelTrainerCurrentSentence.ru;
    
    const words = targetText.replace(/[.,!?;:]/g, '').split(/\s+/).filter(w => w.length > 0);
    
    _currentPhraseWords = words.map((text, index) => ({
        id: index,
        text: text,
        isUsed: false
    }));
    
    _isShortPhrase = words.length <= 3;
    _selectedWords = [];
    _wordQueue = _currentPhraseWords.map(w => ({ ...w }));
    
    initDistractorPool();
    _visibleWords = [];
    
    if (_isShortPhrase) {
        const allWords = _wordQueue.map(w => ({ ...w }));
        _wordQueue = [];
        addDistractorsToVisible(allWords);
    } else {
        const firstThree = [];
        for (let i = 0; i < 3 && _wordQueue.length > 0; i++) {
            firstThree.push(_wordQueue.shift());
        }
        addDistractorsToVisible(firstThree);
    }
    
    shuffleArray(_visibleWords);
    
    levelTrainerHintIndex = 0;
    const isRuToDeHint = levelTrainerDirection === 'ru_to_de';
    levelTrainerHintWords = isRuToDeHint 
        ? levelTrainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/)
        : levelTrainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);
}

// ========== ИНИЦИАЛИЗАЦИЯ ПУЛА ДИСТРАКТОРОВ ==========
function initDistractorPool() {
    const allVocabWords = levelTrainerVocabCache[levelTrainerCurrentLevel] || [];
    const isRuToDe = levelTrainerDirection === 'ru_to_de';
    
    const phraseTexts = new Set(_currentPhraseWords.map(w => w.text.toLowerCase()));
    
    let candidates = allVocabWords.filter(w => {
        const wordText = isRuToDe ? (w.de || '').toLowerCase() : (w.ru || '').toLowerCase();
        return wordText.length > 0 && !phraseTexts.has(wordText);
    });
    
    _distractorPool = candidates.map((w, index) => ({
        id: -1 - index,
        text: isRuToDe ? (w.de || '') : (w.ru || ''),
        isDistractor: true
    }));
    
    shuffleArray(_distractorPool);
}

// ========== ДОБАВЛЕНИЕ ДИСТРАКТОРОВ ==========
function addDistractorsToVisible(words) {
    _visibleWords = words.map(w => ({
        ...w,
        isDistractor: false,
        isUsed: false
    }));
    
    const needed = Math.max(0, 6 - _visibleWords.length);
    let added = 0;
    
    for (let i = 0; i < _distractorPool.length && added < needed; i++) {
        const d = _distractorPool[i];
        const exists = _visibleWords.some(v => v.text.toLowerCase() === d.text.toLowerCase());
        if (!exists) {
            _visibleWords.push({
                id: d.id,
                text: d.text,
                isDistractor: true,
                isUsed: false
            });
            added++;
        }
    }
    
    if (added < needed) {
        const allVocab = levelTrainerVocabCache[levelTrainerCurrentLevel] || [];
        const isRuToDe = levelTrainerDirection === 'ru_to_de';
        const existingTexts = new Set(_visibleWords.map(v => v.text.toLowerCase()));
        
        for (const w of allVocab) {
            if (added >= needed) break;
            const text = isRuToDe ? (w.de || '') : (w.ru || '');
            if (text.length > 0 && !existingTexts.has(text.toLowerCase())) {
                _visibleWords.push({
                    id: -1000 - added,
                    text: text,
                    isDistractor: true,
                    isUsed: false
                });
                added++;
                existingTexts.add(text.toLowerCase());
            }
        }
    }
    
    shuffleArray(_visibleWords);
}

// ========== ВЫБОР СЛОВА ==========
function selectWord(wordId) {
    const wordIndex = _visibleWords.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return;
    
    const word = _visibleWords[wordIndex];
    if (word.isUsed) return;
    
    word.isUsed = true;
    _selectedWords.push(word);
    _visibleWords.splice(wordIndex, 1);
    
    if (!word.isDistractor && _wordQueue.length > 0) {
        const nextWord = _wordQueue.shift();
        _visibleWords.push({
            ...nextWord,
            isDistractor: false,
            isUsed: false
        });
    }
    
    if (_visibleWords.length < 6) {
        const newDistractor = getNextDistractor();
        if (newDistractor) {
            _visibleWords.push(newDistractor);
        }
    }
    
    shuffleArray(_visibleWords);
    updateLevelTrainerDisplay();
}

// ========== ПОЛУЧИТЬ СЛЕДУЮЩИЙ ДИСТРАКТОР ==========
function getNextDistractor() {
    const existingTexts = new Set(_visibleWords.map(v => v.text.toLowerCase()));
    
    for (let i = 0; i < _distractorPool.length; i++) {
        const d = _distractorPool[i];
        if (!existingTexts.has(d.text.toLowerCase())) {
            const result = {
                id: d.id,
                text: d.text,
                isDistractor: true,
                isUsed: false
            };
            _distractorPool.splice(i, 1);
            return result;
        }
    }
    
    const allVocab = levelTrainerVocabCache[levelTrainerCurrentLevel] || [];
    const isRuToDe = levelTrainerDirection === 'ru_to_de';
    const existingTexts2 = new Set(_visibleWords.map(v => v.text.toLowerCase()));
    
    for (const w of allVocab) {
        const text = isRuToDe ? (w.de || '') : (w.ru || '');
        if (text.length > 0 && !existingTexts2.has(text.toLowerCase())) {
            return {
                id: -1000 - Math.floor(Math.random() * 10000),
                text: text,
                isDistractor: true,
                isUsed: false
            };
        }
    }
    
    return null;
}

// ========== ОТРИСОВКА КНОПОК ==========
function renderWordButtons() {
    if (_visibleWords.length === 0) {
        return `<div style="color:#999; text-align:center; padding:20px;">Все слова собраны! ✅</div>`;
    }
    
    return _visibleWords.map(word => `
        <button class="word-btn" data-word-id="${word.id}" 
                style="padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 40px; cursor: pointer;">
            ${word.text}
        </button>
    `).join('');
}

// ========== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ==========
function updateLevelTrainerDisplay() {
    const result = document.getElementById('levelTrainerResult');
    const wordsContainer = document.getElementById('levelTrainerWordsContainer');
    
    if (result) {
        const hasWords = _selectedWords.length > 0;
        const displayText = _selectedWords.map(w => w.text).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.fontWeight = hasWords ? 'bold' : 'normal';
        result.style.backgroundColor = '#FFFFFF';
    }
    
    if (wordsContainer) {
        wordsContainer.innerHTML = renderWordButtons();
        wordsContainer.querySelectorAll('.word-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const wordId = parseInt(this.dataset.wordId);
                if (!isNaN(wordId)) {
                    selectWord(wordId);
                }
            });
        });
    }
}

// ========== ПОКАЗАТЬ ИНТЕРФЕЙС ТРЕНАЖЁРА ==========
function showLevelTrainerInterface() {
    const content = document.getElementById('content');
    if (!content) {
        setTimeout(showLevelTrainerInterface, 100);
        return;
    }
    
    if (levelTrainerSentences.length === 0) {
        updateLevelTrainerPhrases();
        if (levelTrainerSentences.length === 0) {
            showLevelTrainerAllStudied();
            return;
        }
    }
    
    if (levelTrainerIndex >= levelTrainerSentences.length) {
        levelTrainerIndex = 0;
    }
    
    if (!levelTrainerCurrentSentence) {
        if (levelTrainerSentences.length > 0) {
            levelTrainerCurrentSentence = levelTrainerSentences[0];
        } else {
            setTimeout(showLevelTrainerInterface, 200);
            return;
        }
    }
    
    initializePhraseState();
    
    const questionText = levelTrainerDirection === 'ru_to_de' 
        ? levelTrainerCurrentSentence.ru 
        : levelTrainerCurrentSentence.de;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
            <button class="back-btn" onclick="renderLevel()" style="padding: 8px 16px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                ← НАЗАД
            </button>
            <div id="levelTrainerHeaderControls">
                <button id="levelTrainerDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                    ${levelTrainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru'}
                </button>
            </div>
        </div>
        <h2>🧩 Все фразы уровня ${levelTrainerCurrentLevel}</h2>
        <div style="text-align: center;">
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">${levelTrainerDirection === 'ru_to_de' ? 'Составьте предложение на немецком:' : 'Составьте предложение на русском:'}</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-size: 20px; min-height: 60px; color: #CCCCCC; font-weight: normal;" id="levelTrainerResult">
                Нажмите на слова, чтобы собрать предложение
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 500px; margin: 15px auto;" id="levelTrainerWordsContainer">
                ${renderWordButtons()}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0 5px 0;">
                <button class="ctrl-btn" id="levelTrainerUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="levelTrainerResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn" id="levelTrainerCheckBtn" style="background: #3B6FE0 !important; color: white !important; border-color: #2B5BC7 !important;">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="levelTrainerSpeakBtn">🔊 ОЗВУЧИТЬ</button>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 5px 0 15px 0;">
                <button class="ctrl-btn" id="levelTrainerHintBtn">💡 ПОДСКАЗКА</button>
                <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 12px; padding: 10px 16px; flex: 1; min-width: 150px; font-size: 13px; color: #3B6FE0; font-weight: bold; text-align: center; min-height: 42px;" id="levelTrainerHintLabel"></div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 10px 0 5px 0;">
                <button class="ctrl-btn" id="levelTrainerStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="levelTrainerContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 5px 0 10px 0;">
                <button class="ctrl-btn" id="levelTrainerPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                <button class="ctrl-btn" id="levelTrainerNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="levelTrainerResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                <div style="font-size: 14px; color: #888; display: flex; align-items: center; margin-left: 10px;" id="levelTrainerCounter">${levelTrainerIndex + 1} / ${levelTrainerAllPhrases.length}</div>
            </div>
        </div>
    `;
    content.innerHTML = html;
    document.getElementById('modeIndicator').textContent = `🧩 Все фразы уровня ${levelTrainerCurrentLevel}`;
    updateCounter();
    
    setTimeout(function() {
        attachLevelTrainerEvents();
        updateLevelTrainerDisplay();
    }, 50);
}

// ========== ПРИВЯЗКА СОБЫТИЙ ==========
function attachLevelTrainerEvents() {
    const dirBtn = document.getElementById('levelTrainerDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            levelTrainerDirection = levelTrainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = levelTrainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            _cachedDirection = null;
            showLevelTrainerInterface();
        });
    }

    const undoBtn = document.getElementById('levelTrainerUndoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', function() {
            if (_selectedWords.length > 0) {
                const lastWord = _selectedWords.pop();
                _visibleWords.push({
                    ...lastWord,
                    isUsed: false
                });
                shuffleArray(_visibleWords);
                updateLevelTrainerDisplay();
            }
        });
    }

    const resetBtn = document.getElementById('levelTrainerResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            initializePhraseState();
            updateLevelTrainerDisplay();
            document.getElementById('levelTrainerHintLabel').textContent = '';
            levelTrainerHintIndex = 0;
        });
    }

    const checkBtn = document.getElementById('levelTrainerCheckBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            if (_selectedWords.length === 0) {
                const result = document.getElementById('levelTrainerResult');
                result.style.backgroundColor = '#FFCDD2';
                setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
                return;
            }
            
            const userAnswer = _selectedWords.map(w => w.text).join(' ');
            const result = document.getElementById('levelTrainerResult');
            const isRuToDe = levelTrainerDirection === 'ru_to_de';
            const correctAnswerForCheck = isRuToDe ? levelTrainerCurrentSentence.de : levelTrainerCurrentSentence.ru;
            
            const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
            const normalizedCorrect = correctAnswerForCheck.replace(/[.,!?;:]/g, '').trim().toLowerCase();
            
            if (normalizedUser === normalizedCorrect) {
                result.style.backgroundColor = '#C8E6C9';
                result.textContent = '✅ ПРАВИЛЬНО!';
                // ===== ВАЖНО: НЕ СОХРАНЯЕМ В КОНТЕЙНЕР АВТОМАТИЧЕСКИ! =====
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    levelTrainerIndex++;
                    if (levelTrainerIndex >= levelTrainerSentences.length) {
                        levelTrainerIndex = 0;
                    }
                    showLevelTrainerInterface();
                }, 500);
            } else {
                result.style.backgroundColor = '#FFCDD2';
                result.textContent = '❌ Неправильно. Попробуйте снова.';
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    initializePhraseState();
                    updateLevelTrainerDisplay();
                    const hasWords = _selectedWords.length > 0;
                    const displayText = _selectedWords.map(w => w.text).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
                    result.textContent = displayText;
                    result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
                    result.style.fontWeight = hasWords ? 'bold' : 'normal';
                }, 800);
            }
        });
    }

    const speakBtn = document.getElementById('levelTrainerSpeakBtn');
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            if (typeof window.speak === 'function') {
                window.speak(levelTrainerCurrentSentence.de);
            }
        });
    }

    const hintBtn = document.getElementById('levelTrainerHintBtn');
    if (hintBtn) {
        hintBtn.addEventListener('click', function() {
            const hintLabel = document.getElementById('levelTrainerHintLabel');
            const hintWords = levelTrainerHintWords || [];
            
            if (levelTrainerHintIndex < hintWords.length) {
                const currentHint = hintWords.slice(0, levelTrainerHintIndex + 1).join(' ');
                hintLabel.textContent = '💡 ' + currentHint;
                levelTrainerHintIndex++;
            } else {
                hintLabel.textContent = '💡 Полное предложение: ' + hintWords.join(' ');
            }
        });
    }

    const studyBtn = document.getElementById('levelTrainerStudyBtn');
    if (studyBtn) {
        studyBtn.addEventListener('click', function() {
            if (levelTrainerCurrentSentence) {
                const key = levelTrainerCurrentSentence.de + '|' + levelTrainerCurrentSentence.ru;
                levelTrainerStudied[key] = true;
                saveLevelTrainerStudied(levelTrainerCurrentLevel);
                updateLevelTrainerPhrases();
                if (levelTrainerSentences.length === 0 && levelTrainerAllPhrases.length > 0) {
                    levelTrainerSentences = [...levelTrainerAllPhrases];
                }
                if (levelTrainerSentences.length > 0) {
                    levelTrainerIndex = (levelTrainerIndex + 1) % levelTrainerSentences.length;
                } else {
                    levelTrainerIndex = 0;
                }
                showLevelTrainerInterface();
            }
        });
    }

    const containerBtn = document.getElementById('levelTrainerContainerBtn');
    if (containerBtn) {
        containerBtn.addEventListener('click', function() {
            const studied = getLevelTrainerStudiedList();
            if (!studied || studied.length === 0) {
                alert('📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.');
                return;
            }
            showLevelTrainerContainer();
        });
    }

    const prevBtn = document.getElementById('levelTrainerPrevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (levelTrainerSentences.length > 0) {
                levelTrainerIndex = (levelTrainerIndex - 1 + levelTrainerSentences.length) % levelTrainerSentences.length;
                levelTrainerHintIndex = 0;
                showLevelTrainerInterface();
            }
        });
    }

    const nextBtn = document.getElementById('levelTrainerNextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (levelTrainerSentences.length > 0) {
                levelTrainerIndex = (levelTrainerIndex + 1) % levelTrainerSentences.length;
                levelTrainerHintIndex = 0;
                showLevelTrainerInterface();
            }
        });
    }

    const resetStartBtn = document.getElementById('levelTrainerResetStartBtn');
    if (resetStartBtn) {
        resetStartBtn.addEventListener('click', function() {
            if (levelTrainerSentences.length > 0) {
                levelTrainerIndex = 0;
                levelTrainerHintIndex = 0;
                showLevelTrainerInterface();
            }
        });
    }
}

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ПЕРЕМЕШИВАНИЕ ==========
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ========== КОНТЕЙНЕР ==========
function showLevelTrainerContainer() {
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

    const studied = getLevelTrainerStudiedList();
    const title = `📦 КОНТЕЙНЕР ФРАЗ УРОВНЯ ${levelTrainerCurrentLevel} (${studied.length} фраз)`;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">${title}</h3>`;
    modalContent.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';

    if (studied.length === 0) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>`;
    } else {
        studied.forEach((phrase) => {
            const key = phrase.de + '|' + phrase.ru;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <span><strong>${phrase.de}</strong> — ${phrase.ru}</span>
                <button class="unstudy-btn" data-key="${key}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            const btn = item.querySelector('.unstudy-btn');
            btn.addEventListener('click', function() {
                const key = this.getAttribute('data-key');
                delete levelTrainerStudied[key];
                saveLevelTrainerStudied(levelTrainerCurrentLevel);
                updateLevelTrainerPhrases();
                if (levelTrainerSentences.length === 0 && levelTrainerAllPhrases.length > 0) {
                    levelTrainerSentences = [...levelTrainerAllPhrases];
                }
                if (levelTrainerSentences.length > 0 && levelTrainerIndex >= levelTrainerSentences.length) {
                    levelTrainerIndex = 0;
                }
                modal.remove();
                showLevelTrainerInterface();
            });
            itemsContainer.appendChild(item);
        });
    }
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
        if (!confirm('Вернуть все фразы из контейнера?')) return;
        levelTrainerAllPhrases.forEach(phrase => {
            const key = phrase.de + '|' + phrase.ru;
            delete levelTrainerStudied[key];
        });
        saveLevelTrainerStudied(levelTrainerCurrentLevel);
        updateLevelTrainerPhrases();
        if (levelTrainerSentences.length === 0 && levelTrainerAllPhrases.length > 0) {
            levelTrainerSentences = [...levelTrainerAllPhrases];
        }
        levelTrainerIndex = 0;
        modal.remove();
        showLevelTrainerInterface();
    });

    document.getElementById('closeContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ===== ЭКСПОРТ =====
window.loadAllPhrasesMode = loadAllPhrasesMode;
window.showLevelTrainerContainer = showLevelTrainerContainer;

console.log('🧩 levelTrainerMode.js загружен (6 КНОПОК + ПОДГРУЗКА)');

// ===== ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ =====
window._visibleWords = _visibleWords;
window._selectedWords = _selectedWords;
window._wordQueue = _wordQueue;
window._currentPhraseWords = _currentPhraseWords;
window.selectWord = selectWord;
window.initializePhraseState = initializePhraseState;
window.updateLevelTrainerDisplay = updateLevelTrainerDisplay;
window.showLevelTrainerInterface = showLevelTrainerInterface;

// ===== АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator && modeIndicator.textContent.includes('Все фразы уровня')) {
        const level = window.currentLevel || 'A1';
        if (typeof window.loadAllPhrasesMode === 'function') {
            setTimeout(function() {
                window.loadAllPhrasesMode(level);
            }, 300);
        }
    }
});
