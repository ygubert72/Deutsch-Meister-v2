// ====================================================================
// levelTrainerMode.js — Тренажёр "Все фразы уровня"
// Загружает ОДИН файл all_phrases.json вместо 19 отдельных
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

// Счётчик для генерации уникальных ID
let _wordIdCounter = 0;

// ========== ЗАГРУЗКА ВСЕХ ФРАЗ УРОВНЯ (ИЗ ОДНОГО ФАЙЛА) ==========
async function loadAllPhrasesForLevel(level) {
    try {
        const response = await fetch(`docs/${level}/all_phrases.json`);
        if (!response.ok) {
            throw new Error(`Файл docs/${level}/all_phrases.json не найден`);
        }
        const allPhrases = await response.json();
        console.log(`📚 Загружено ${allPhrases.length} фраз для уровня ${level} (из одного файла)`);
        return allPhrases;
    } catch(e) {
        console.error('❌ Ошибка загрузки all_phrases.json:', e);
        console.log('🔄 Пробуем загрузить фразы по-старому (из отдельных уроков)...');
        return await loadAllPhrasesLegacy(level);
    }
}

// ========== СТАРЫЙ СПОСОБ (запасной, для обратной совместимости) ==========
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
            } catch(e) {
                console.log('⚠️ Не удалось загрузить урок', lessonId);
            }
        }
        console.log(`📚 Загружено ${allPhrases.length} фраз для уровня ${level} (по-старому)`);
        return allPhrases;
    } catch(e) {
        console.error('❌ Ошибка загрузки фраз уровня (legacy):', e);
        return [];
    }
}

// ========== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ (для дистракторов) ==========
async function loadAllVocabularyForLevelTrainer(level) {
    if (levelTrainerVocabCache[level]) {
        return levelTrainerVocabCache[level];
    }
    try {
        const indexResponse = await fetch(`docs/${level}/index.json`);
        if (!indexResponse.ok) throw new Error('Не удалось загрузить индекс уровня');
        const indexData = await indexResponse.json();
        let allWords = [];
        const seen = new Set();
        for (const lesson of indexData.lessons) {
            const lessonId = lesson.id;
            const grammarFile = `docs/${level}/grammar/${String(lessonId).padStart(2, '0')}_grammar.json`;
            try {
                const response = await fetch(grammarFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.vocabulary && Array.isArray(data.vocabulary)) {
                        for (const word of data.vocabulary) {
                            if (word.de && !seen.has(word.de)) {
                                seen.add(word.de);
                                allWords.push(word);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        for (const lesson of indexData.lessons) {
            const lessonId = lesson.id;
            const lessonFile = `docs/${level}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            try {
                const response = await fetch(lessonFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.quiz && Array.isArray(data.quiz)) {
                        for (const word of data.quiz) {
                            if (word.de && !seen.has(word.de)) {
                                seen.add(word.de);
                                allWords.push(word);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        levelTrainerVocabCache[level] = allWords;
        console.log(`📚 Загружено ${allWords.length} уникальных слов для уровня ${level} (дистракторы)`);
        return allWords;
    } catch(e) {
        console.error('❌ Ошибка загрузки словаря уровня:', e);
        return [];
    }
}

// ========== ЗАГРУЗКА КОНТЕЙНЕРА ==========
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

// ========== СОХРАНЕНИЕ КОНТЕЙНЕРА ==========
function saveLevelTrainerStudied(level) {
    const key = 'dm_level_trainer_studied_' + level;
    try {
        localStorage.setItem(key, JSON.stringify(levelTrainerStudied));
    } catch(e) {
        console.warn('⚠️ Ошибка сохранения контейнера фраз уровня:', e);
    }
}

// ========== ПОЛУЧИТЬ ИЗУЧЕННЫЕ ФРАЗЫ ==========
function getLevelTrainerStudiedList() {
    if (!levelTrainerAllPhrases) return [];
    return levelTrainerAllPhrases.filter(phrase => {
        const key = phrase.de + '|' + phrase.ru;
        return levelTrainerStudied[key] === true;
    });
}

// ========== ОБНОВЛЕНИЕ СПИСКА ФРАЗ ДЛЯ ПОКАЗА ==========
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
    console.log('🔄 loadAllPhrasesMode вызван для уровня:', level);
    levelTrainerCurrentLevel = level;
    levelTrainerVocabCache = {};
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
            <div style="font-size: 14px; margin-top: 10px;">В уроках этого уровня нет фраз для тренажёра.</div>
            <button class="back-btn" onclick="renderLevel()" style="margin-top: 20px;">← НАЗАД</button>
        </div>
    `;
    document.getElementById('modeIndicator').textContent = `🧩 Все фразы уровня ${levelTrainerCurrentLevel}`;
    updateCounter();
}

// ========== ПОКАЗАТЬ ИНТЕРФЕЙС ТРЕНАЖЁРА ==========
function showLevelTrainerInterface() {
    const content = document.getElementById('content');
    if (!content) return;
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
    
    // ===== ИСПРАВЛЕНО: правильные слова с уникальными ID =====
    const correctWords = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true,
        originalIndex: i,
        id: ++_wordIdCounter
    }));

    // ===== ИСПРАВЛЕНО: для дистракторов используем слова на нужном языке =====
    const allVocabWords = levelTrainerVocabCache[levelTrainerCurrentLevel] || [];
    let allDistractorWords = [];
    
    if (isRuToDe) {
        // Режим Ru → De: дистракторы — немецкие слова
        allDistractorWords = allVocabWords.map(w => ({
            display: w.de,
            de: w.de,
            ru: w.ru || w.de,
            isCorrect: false
        }));
    } else {
        // Режим De → Ru: дистракторы — русские слова
        allDistractorWords = allVocabWords.map(w => ({
            display: w.ru || w.de,
            de: w.de,
            ru: w.ru || w.de,
            isCorrect: false
        }));
    }

    // Перемешиваем дистракторы
    const shuffledDistractors = [...allDistractorWords];
    for (let i = shuffledDistractors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDistractors[i], shuffledDistractors[j]] = [shuffledDistractors[j], shuffledDistractors[i]];
    }

    // Множество правильных слов (для исключения)
    const correctSet = new Set(
        correctWords.map(w => w.display.toLowerCase().replace(/[.,!?;:]/g, ''))
    );

    // Фильтруем дистракторы: убираем те, что совпадают с правильными словами
    const filteredDistractors = shuffledDistractors
        .filter(w => {
            const key = w.display.toLowerCase().replace(/[.,!?;:]/g, '');
            return !correctSet.has(key) && key.length > 0;
        })
        .slice(0, 12 - deWords.length);

    // ===== ИСПРАВЛЕНО: формируем список слов для выбора с уникальными ID =====
    let finalAll = [];
    correctWords.forEach(w => {
        finalAll.push({
            ...w,
            id: ++_wordIdCounter
        });
    });

    const maxTotal = 12;
    const needed = Math.max(0, maxTotal - correctWords.length);
    const selectedDistractors = filteredDistractors.slice(0, needed);

    selectedDistractors.forEach(d => {
        finalAll.push({
            display: d.display,
            de: d.de,
            ru: d.ru,
            isCorrect: false,
            originalIndex: -1,
            id: ++_wordIdCounter
        });
    });

    // Если всё ещё не хватает слов, добавляем случайные из оставшихся
    while (finalAll.length < maxTotal && allDistractorWords.length > 0) {
        const extraWord = allDistractorWords.find(w => 
            !finalAll.some(f => f.display === w.display)
        );
        if (extraWord) {
            finalAll.push({
                display: extraWord.display,
                de: extraWord.de,
                ru: extraWord.ru,
                isCorrect: false,
                originalIndex: -1,
                id: ++_wordIdCounter
            });
        } else {
            break;
        }
    }

    levelTrainerAvailableWords = finalAll;
    for (let i = levelTrainerAvailableWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [levelTrainerAvailableWords[i], levelTrainerAvailableWords[j]] = [levelTrainerAvailableWords[j], levelTrainerAvailableWords[i]];
    }

    levelTrainerSelectedWords = [];
    levelTrainerActiveWords = {};
    levelTrainerAvailableWords.forEach(w => {
        levelTrainerActiveWords[w.id] = true;
    });
    levelTrainerHintIndex = 0;
    levelTrainerHintWords = deWords;

    const questionText = isRuToDe ? levelTrainerCurrentSentence.ru : levelTrainerCurrentSentence.de;
    const hasWords = levelTrainerSelectedWords.length > 0;
    const displayText = levelTrainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
    const textColor = hasWords ? '#1A1A1A' : '#CCCCCC';
    const fontWeight = hasWords ? 'bold' : 'normal';

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
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-size: 20px; min-height: 60px; color: ${textColor}; font-weight: ${fontWeight};" id="levelTrainerResult">
                ${displayText}
            </div>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; max-width: 700px; margin: 15px auto;" id="levelTrainerWordsContainer">
                ${levelTrainerAvailableWords.map(word => {
                    const isActive = levelTrainerActiveWords[word.id];
                    return `
                        <button class="word-btn" data-word-id="${word.id}" style="padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 40px; ${!isActive ? 'opacity: 0.4; pointer-events: none;' : ''}">
                            ${word.display}
                        </button>
                    `;
                }).join('')}
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
                <div style="font-size: 14px; color: #888; display: flex; align-items: center; margin-left: 10px;" id="levelTrainerCounter">${levelTrainerIndex + 1} / ${levelTrainerSentences.length}</div>
            </div>
        </div>
    `;
    content.innerHTML = html;
    document.getElementById('modeIndicator').textContent = `🧩 Все фразы уровня ${levelTrainerCurrentLevel}`;
    updateCounter();
    attachLevelTrainerEvents();
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

// ========== ПРИВЯЗКА СОБЫТИЙ ==========
function attachLevelTrainerEvents() {
    const dirBtn = document.getElementById('levelTrainerDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            levelTrainerDirection = levelTrainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = levelTrainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            _wordIdCounter = 0;
            showLevelTrainerInterface();
        });
    }

    // Контейнер со словами — используем делегирование
    const wordsContainer = document.getElementById('levelTrainerWordsContainer');
    if (wordsContainer) {
        wordsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.word-btn');
            if (!btn) return;
            const wordId = parseInt(btn.dataset.wordId);
            if (isNaN(wordId)) return;
            if (!levelTrainerActiveWords[wordId]) return;
            const foundWord = levelTrainerAvailableWords.find(w => w.id === wordId);
            if (!foundWord) return;
            levelTrainerActiveWords[wordId] = false;
            levelTrainerSelectedWords.push(foundWord);
            updateLevelTrainerDisplay();
        });
    }

    const undoBtn = document.getElementById('levelTrainerUndoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', function() {
            if (levelTrainerSelectedWords.length > 0) {
                const lastWord = levelTrainerSelectedWords.pop();
                levelTrainerActiveWords[lastWord.id] = true;
                updateLevelTrainerDisplay();
            }
        });
    }

    const resetBtn = document.getElementById('levelTrainerResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            levelTrainerSelectedWords = [];
            levelTrainerAvailableWords.forEach(w => {
                levelTrainerActiveWords[w.id] = true;
            });
            updateLevelTrainerDisplay();
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
                    showLevelTrainerInterface();
                }, 500);
            } else {
                result.style.backgroundColor = '#FFCDD2';
                result.textContent = '❌ Неправильно. Попробуйте снова.';
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    levelTrainerSelectedWords.forEach(w => {
                        levelTrainerActiveWords[w.id] = true;
                    });
                    levelTrainerSelectedWords = [];
                    updateLevelTrainerDisplay();
                    const hasWords = levelTrainerSelectedWords.length > 0;
                    const displayText = levelTrainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
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
                showLevelTrainerInterface();
            }
        });
    }
}

// ========== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ==========
function updateLevelTrainerDisplay() {
    const result = document.getElementById('levelTrainerResult');
    const wordsContainer = document.getElementById('levelTrainerWordsContainer');
    if (result) {
        const hasWords = levelTrainerSelectedWords.length > 0;
        const displayText = levelTrainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.fontWeight = hasWords ? 'bold' : 'normal';
        result.style.backgroundColor = '#FFFFFF';
    }
    if (wordsContainer) {
        wordsContainer.innerHTML = '';
        levelTrainerAvailableWords.forEach(word => {
            const isActive = levelTrainerActiveWords[word.id];
            const btn = document.createElement('button');
            btn.className = 'word-btn';
            btn.textContent = word.display;
            btn.dataset.wordId = word.id;
            btn.style.cssText = isActive 
                ? 'padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 40px; cursor: pointer;'
                : 'padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 40px; cursor: default; opacity: 0.4; pointer-events: none;';
            wordsContainer.appendChild(btn);
        });
    }
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

console.log('🧩 levelTrainerMode.js загружен (ИСПРАВЛЕННАЯ ВЕРСИЯ)');
