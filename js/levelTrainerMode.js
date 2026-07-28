// ====================================================================
// levelTrainerMode.js — Тренажёр "Все фразы уровня" (ВОЛНОВОЙ ПРИНЦИП)
// ====================================================================

(function() {

let levelTrainerSentences = [];
let levelTrainerIndex = 0;
let levelTrainerCurrentSentence = null;
let levelTrainerSelectedWords = [];
let levelTrainerAvailableWords = [];
let levelTrainerHintIndex = 0;
let levelTrainerHintWords = [];
let levelTrainerDirection = 'ru_to_de';
let levelTrainerStudied = {};
let levelTrainerCurrentLevel = 'A1';
let levelTrainerAllPhrases = [];
let levelTrainerVocabCache = {};

// ===== КЕШ ДЛЯ ДИСТРАКТОРОВ =====
let _cachedDistractors = null;
let _cachedLevel = null;
let _cachedDirection = null;

// ===== ОЧЕРЕДЬ ДЛЯ ПОДГРУЗКИ =====
let _wordQueue = [];

// Счётчик для генерации уникальных ID
let _wordIdCounter = 0;

// ===== КЕШ ДЛЯ ВСЕХ ФРАЗ УРОВНЯ =====
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
    
    const response = await fetch(`docs/${level}.json`);
    const allWords = await response.json();
    
    levelTrainerVocabCache[level] = allWords;
    console.log(`📚 Загружено ${allWords.length} слов для уровня ${level}`);
    return allWords;
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

// ========== ВСТАВКА СЛОВА В СЛУЧАЙНУЮ ПОЗИЦИЮ ==========
function insertWordAtRandomPosition(words, word) {
    const pos = Math.floor(Math.random() * (words.length + 1));
    words.splice(pos, 0, word);
    return pos;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
window.loadAllPhrasesMode = async function(level) {
    console.log('🔄 loadAllPhrasesMode вызван для уровня:', level);
    levelTrainerCurrentLevel = level;
    levelTrainerVocabCache = {};
    _cachedDistractors = null;
    _cachedLevel = null;
    _cachedDirection = null;
    _wordQueue = [];
    _wordIdCounter = 0;
    
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
    _wordIdCounter = 0;
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

// ========== ПОКАЗАТЬ ИНТЕРФЕЙС ТРЕНАЖЁРА ==========
function showLevelTrainerInterface() {
    const content = document.getElementById('content');
    if (!content) return;
    
    // ЗАКОЛЬЦОВКА
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
    
    levelTrainerCurrentSentence = levelTrainerSentences[levelTrainerIndex];
    const isRuToDe = levelTrainerDirection === 'ru_to_de';
    const deWords = levelTrainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = levelTrainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);
    
    // ===== ПРАВИЛЬНЫЕ СЛОВА =====
    const correctWords = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true,
        originalIndex: i,
        id: ++_wordIdCounter
    }));

    // ===== КЕШИРУЕМ ДИСТРАКТОРЫ =====
    if (_cachedLevel !== levelTrainerCurrentLevel || _cachedDirection !== levelTrainerDirection) {
        _cachedLevel = levelTrainerCurrentLevel;
        _cachedDirection = levelTrainerDirection;
        
        const allVocabWords = levelTrainerVocabCache[levelTrainerCurrentLevel] || [];
        
        if (isRuToDe) {
            _cachedDistractors = allVocabWords.map(w => ({
                display: w.de,
                de: w.de,
                ru: w.ru || w.de,
                isCorrect: false
            }));
        } else {
            _cachedDistractors = allVocabWords.map(w => ({
                display: w.ru || w.de,
                de: w.de,
                ru: w.ru || w.de,
                isCorrect: false
            }));
        }
    }

    const allDistractorWords = _cachedDistractors || [];

    const shuffledDistractors = [...allDistractorWords];
    for (let i = shuffledDistractors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDistractors[i], shuffledDistractors[j]] = [shuffledDistractors[j], shuffledDistractors[i]];
    }

    const correctSet = new Set(
        correctWords.map(w => w.display.toLowerCase().replace(/[.,!?;:]/g, ''))
    );

    const filteredDistractors = shuffledDistractors
        .filter(w => {
            const key = w.display.toLowerCase().replace(/[.,!?;:]/g, '');
            return !correctSet.has(key) && key.length > 0;
        });

    // ===== 6 КНОПОК: берём первые 3 правильных слова, остальные в очередь =====
    let visibleCorrectWords = [];
    let remainingCorrectWords = [];
    
    if (correctWords.length <= 3) {
        visibleCorrectWords = [...correctWords];
        remainingCorrectWords = [];
    } else {
        visibleCorrectWords = correctWords.slice(0, 3);
        remainingCorrectWords = correctWords.slice(3);
    }

    // ===== СОЗДАЁМ НОВЫЕ УНИКАЛЬНЫЕ ID ДЛЯ ОЧЕРЕДИ =====
    _wordQueue = remainingCorrectWords.map(w => ({
        id: ++_wordIdCounter,
        display: w.display,
        de: w.de,
        ru: w.ru,
        isCorrect: true,
        originalIndex: w.originalIndex
    }));

    let finalAll = [];
    visibleCorrectWords.forEach(w => {
        finalAll.push({
            ...w,
            id: w.id
        });
    });

    const maxTotal = 6;
    const needed = Math.max(0, maxTotal - visibleCorrectWords.length);
    const selectedDistractors = filteredDistractors.slice(0, needed);

    selectedDistractors.forEach(d => {
        finalAll.push({
            display: d.display,
            de: d.de,
            ru: d.ru,
            isCorrect: false,
            originalIndex: -1,
            id: --_wordIdCounter
        });
    });

    let distractorIndex = 0;
    while (finalAll.length < maxTotal && distractorIndex < allDistractorWords.length) {
        const d = allDistractorWords[distractorIndex];
        const exists = finalAll.some(f => f.display === d.display);
        if (!exists) {
            finalAll.push({
                display: d.display,
                de: d.de,
                ru: d.ru,
                isCorrect: false,
                originalIndex: -1,
                id: --_wordIdCounter
            });
        }
        distractorIndex++;
    }

    levelTrainerAvailableWords = finalAll;
    
    // ПЕРЕМЕШИВАНИЕ ТОЛЬКО ПРИ ИНИЦИАЛИЗАЦИИ
    for (let i = levelTrainerAvailableWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [levelTrainerAvailableWords[i], levelTrainerAvailableWords[j]] = [levelTrainerAvailableWords[j], levelTrainerAvailableWords[i]];
    }

    levelTrainerSelectedWords = [];
    levelTrainerHintIndex = 0;
    levelTrainerHintWords = deWords;

    const questionText = isRuToDe ? levelTrainerCurrentSentence.ru : levelTrainerCurrentSentence.de;

    // ===== HTML =====
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
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">${isRuToDe ? 'Составьте предложение на немецком:' : 'Составьте предложение на русском:'}</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-size: 20px; min-height: 60px; color: #CCCCCC; font-weight: normal;" id="levelTrainerResult">
                Нажмите на слова, чтобы собрать предложение
            </div>
            <div class="words-container" id="levelTrainerWordsContainer">
                ${levelTrainerAvailableWords.map(word => `
                    <button class="word-btn" data-word-id="${word.id}">
                        ${word.display}
                    </button>
                `).join('')}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0 5px 0;">
                <button class="ctrl-btn" id="levelTrainerUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="levelTrainerResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn" id="levelTrainerCheckBtn" style="background: #3B6FE0 !important; color: white !important; border-color: #2B5BC7 !important;">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="levelTrainerSpeakBtn">🔊 ОЗВУЧИТЬ</button>
                <button class="ctrl-btn" id="levelTrainerShuffleBtn" style="background: #9C27B0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔄 ПЕРЕМЕШАТЬ</button>
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
    attachLevelTrainerEvents();
}

// ========== ПРИВЯЗКА СОБЫТИЙ ==========
function attachLevelTrainerEvents() {
    const dirBtn = document.getElementById('levelTrainerDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            levelTrainerDirection = levelTrainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = levelTrainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            _cachedDirection = null;
            _wordIdCounter = 0;
            _wordQueue = [];
            showLevelTrainerInterface();
        });
    }

    const wordsContainer = document.getElementById('levelTrainerWordsContainer');
    if (wordsContainer) {
        wordsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.word-btn');
            if (!btn) return;
            const wordId = parseInt(btn.dataset.wordId);
            if (isNaN(wordId)) return;
            
            const wordIndex = levelTrainerAvailableWords.findIndex(w => w.id === wordId);
            if (wordIndex === -1) return;
            
            const selectedWord = levelTrainerAvailableWords[wordIndex];
            
            // 1. Удаляем выбранное слово
            levelTrainerAvailableWords.splice(wordIndex, 1);
            
            // 2. Добавляем в выбранные
            levelTrainerSelectedWords.push(selectedWord);
            
            // 3. Обновляем результат
            updateLevelTrainerResultDisplay();
            
            // 4. Подбираем слово для замены
            let replacementWord = null;
            
            if (_wordQueue.length > 0) {
                const queued = _wordQueue.shift();
                replacementWord = {
                    display: queued.display,
                    de: queued.de,
                    ru: queued.ru,
                    isCorrect: true,
                    originalIndex: queued.originalIndex,
                    id: ++_wordIdCounter
                };
            } else {
                const allDistractorWords = _cachedDistractors || [];
                const usedDisplaySet = new Set(levelTrainerAvailableWords.map(w => w.display));
                const availableDistractors = allDistractorWords
                    .filter(w => !usedDisplaySet.has(w.display) && w.display.length > 0)
                    .map(w => ({
                        display: w.display,
                        de: w.de,
                        ru: w.ru,
                        isCorrect: false,
                        originalIndex: -1,
                        id: --_wordIdCounter
                    }));
                
                if (availableDistractors.length > 0) {
                    const randomDistractor = availableDistractors[Math.floor(Math.random() * availableDistractors.length)];
                    replacementWord = randomDistractor;
                } else {
                    replacementWord = {
                        display: '___',
                        de: '___',
                        ru: '___',
                        isCorrect: false,
                        originalIndex: -1,
                        id: --_wordIdCounter
                    };
                }
            }
            
            // 5. Вставляем замену
            if (replacementWord) {
                insertWordAtRandomPosition(levelTrainerAvailableWords, replacementWord);
            }
            
            // ===== ЖЁСТКО ОБРЕЗАЕМ ДО 6 =====
            if (levelTrainerAvailableWords.length > 6) {
                levelTrainerAvailableWords = levelTrainerAvailableWords.slice(0, 6);
            }
            
            // 6. Перерисовываем
            renderLevelTrainerWords();
        });
    }

    const undoBtn = document.getElementById('levelTrainerUndoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', function() {
            if (levelTrainerSelectedWords.length > 0) {
                const lastWord = levelTrainerSelectedWords.pop();
                const wordWithNewId = {
                    ...lastWord,
                    id: ++_wordIdCounter
                };
                insertWordAtRandomPosition(levelTrainerAvailableWords, wordWithNewId);
                if (levelTrainerAvailableWords.length > 6) {
                    levelTrainerAvailableWords = levelTrainerAvailableWords.slice(0, 6);
                }
                updateLevelTrainerResultDisplay();
                renderLevelTrainerWords();
            }
        });
    }

    const resetBtn = document.getElementById('levelTrainerResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            while (levelTrainerSelectedWords.length > 0) {
                const word = levelTrainerSelectedWords.pop();
                const wordWithNewId = {
                    ...word,
                    id: ++_wordIdCounter
                };
                insertWordAtRandomPosition(levelTrainerAvailableWords, wordWithNewId);
            }
            if (levelTrainerAvailableWords.length > 6) {
                levelTrainerAvailableWords = levelTrainerAvailableWords.slice(0, 6);
            }
            updateLevelTrainerResultDisplay();
            renderLevelTrainerWords();
            document.getElementById('levelTrainerHintLabel').textContent = '';
            levelTrainerHintIndex = 0;
        });
    }

    const checkBtn = document.getElementById('levelTrainerCheckBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            if (levelTrainerSelectedWords.length === 0) {
                const result = document.getElementById('levelTrainerResult');
                result.style.backgroundColor = '#FFCDD2';
                setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
                return;
            }
            const userAnswer = levelTrainerSelectedWords.map(w => w.display).join(' ');
            const result = document.getElementById('levelTrainerResult');
            const isRuToDe = levelTrainerDirection === 'ru_to_de';
            const correctAnswerForCheck = isRuToDe ? levelTrainerCurrentSentence.de : levelTrainerCurrentSentence.ru;
            const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
            const normalizedCorrect = correctAnswerForCheck.replace(/[.,!?;:]/g, '').trim().toLowerCase();
            if (normalizedUser === normalizedCorrect) {
                result.style.backgroundColor = '#C8E6C9';
                result.textContent = '✅ ПРАВИЛЬНО!';
                const key = levelTrainerCurrentSentence.de + '|' + levelTrainerCurrentSentence.ru;
                levelTrainerStudied[key] = true;
                saveLevelTrainerStudied(levelTrainerCurrentLevel);
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    levelTrainerIndex++;
                    if (levelTrainerIndex >= levelTrainerSentences.length) {
                        levelTrainerIndex = 0;
                    }
                    _wordIdCounter = 0;
                    _wordQueue = [];
                    showLevelTrainerInterface();
                }, 500);
            } else {
                result.style.backgroundColor = '#FFCDD2';
                result.textContent = '❌ Неправильно. Попробуйте снова.';
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    while (levelTrainerSelectedWords.length > 0) {
                        const word = levelTrainerSelectedWords.pop();
                        const wordWithNewId = {
                            ...word,
                            id: ++_wordIdCounter
                        };
                        insertWordAtRandomPosition(levelTrainerAvailableWords, wordWithNewId);
                    }
                    if (levelTrainerAvailableWords.length > 6) {
                        levelTrainerAvailableWords = levelTrainerAvailableWords.slice(0, 6);
                    }
                    updateLevelTrainerResultDisplay();
                    renderLevelTrainerWords();
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

    const shuffleBtn = document.getElementById('levelTrainerShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            if (levelTrainerSentences.length === 0) return;
            for (let i = levelTrainerSentences.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [levelTrainerSentences[i], levelTrainerSentences[j]] = [levelTrainerSentences[j], levelTrainerSentences[i]];
            }
            levelTrainerIndex = 0;
            _wordIdCounter = 0;
            _wordQueue = [];
            showLevelTrainerInterface();
            console.log('🔄 Фразы уровня перемешаны');
        });
    }

    const hintBtn = document.getElementById('levelTrainerHintBtn');
    if (hintBtn) {
        hintBtn.addEventListener('click', function() {
            const hintLabel = document.getElementById('levelTrainerHintLabel');
            if (levelTrainerHintIndex < levelTrainerHintWords.length) {
                const currentHint = levelTrainerHintWords.slice(0, levelTrainerHintIndex + 1).join(' ');
                hintLabel.textContent = '💡 ' + currentHint;
                levelTrainerHintIndex++;
            } else {
                hintLabel.textContent = '💡 Полное предложение: ' + levelTrainerHintWords.join(' ');
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
                _wordIdCounter = 0;
                _wordQueue = [];
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
                _wordIdCounter = 0;
                _wordQueue = [];
                showLevelTrainerInterface();
            }
        });
    }

    const nextBtn = document.getElementById('levelTrainerNextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (levelTrainerSentences.length > 0) {
                levelTrainerIndex = (levelTrainerIndex + 1) % levelTrainerSentences.length;
                _wordIdCounter = 0;
                _wordQueue = [];
                showLevelTrainerInterface();
            }
        });
    }

    const resetStartBtn = document.getElementById('levelTrainerResetStartBtn');
    if (resetStartBtn) {
        resetStartBtn.addEventListener('click', function() {
            if (levelTrainerSentences.length > 0) {
                levelTrainerIndex = 0;
                _wordIdCounter = 0;
                _wordQueue = [];
                showLevelTrainerInterface();
            }
        });
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function updateLevelTrainerResultDisplay() {
    const result = document.getElementById('levelTrainerResult');
    if (result) {
        const hasWords = levelTrainerSelectedWords.length > 0;
        const displayText = levelTrainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.fontWeight = hasWords ? 'bold' : 'normal';
        result.style.backgroundColor = '#FFFFFF';
    }
}

function renderLevelTrainerWords() {
    const wordsContainer = document.getElementById('levelTrainerWordsContainer');
    if (!wordsContainer) return;
    
    wordsContainer.innerHTML = '';
    levelTrainerAvailableWords.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'word-btn';
        btn.textContent = word.display;
        btn.dataset.wordId = word.id;
        wordsContainer.appendChild(btn);
    });
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

console.log('🧩 levelTrainerMode.js загружен (ВОЛНОВОЙ ПРИНЦИП)');

})();
