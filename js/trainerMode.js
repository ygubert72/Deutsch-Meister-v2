// ====================================================================
// trainerMode.js — Тренажёр (сборка фраз из слов) — 6 КНОПОК, БЕЗ ПЕРЕМЕШИВАНИЯ
// ====================================================================

(function() {

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerHintIndex = 0;
let trainerHintWords = [];
let trainerDirection = 'ru_to_de';
let allVocabWords = [];
let trainerStudiedSentences = {};
let trainerCurrentLessonId = null;
let trainerCurrentLessonData = null;
let allTrainerTemplates = [];
let globalVocabularyCache = {};

// ===== СОСТОЯНИЕ ДЛЯ 6 КНОПОК =====
let _visibleWords = [];
let _wordQueue = [];
let _distractorPool = [];
let _selectedWords = [];
let _currentPhraseWords = [];
let _isShortPhrase = false;

// ===== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ==========
async function loadAllVocabularyForLevel(level) {
    if (globalVocabularyCache[level]) {
        return globalVocabularyCache[level];
    }
    
    try {
        const indexResponse = await fetch(`docs/${level}/index.json`);
        if (!indexResponse.ok) throw new Error('Не удалось загрузить индекс уровня');
        const indexData = await indexResponse.json();
        
        let allWords = [];
        
        for (const lesson of indexData.lessons) {
            const lessonId = lesson.id;
            const grammarFile = `docs/${level}/grammar/${String(lessonId).padStart(2, '0')}_grammar.json`;
            try {
                const response = await fetch(grammarFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.vocabulary && Array.isArray(data.vocabulary)) {
                        allWords = allWords.concat(data.vocabulary);
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
                        allWords = allWords.concat(data.quiz);
                    }
                }
            } catch(e) {}
        }
        
        const uniqueWords = [];
        const seen = new Set();
        for (const word of allWords) {
            if (word.de && !seen.has(word.de)) {
                seen.add(word.de);
                uniqueWords.push(word);
            }
        }
        
        globalVocabularyCache[level] = uniqueWords;
        console.log(`📚 Загружено ${uniqueWords.length} уникальных слов для уровня ${level}`);
        return uniqueWords;
        
    } catch(e) {
        console.error('Ошибка загрузки словаря уровня:', e);
        return [];
    }
}

function renderTrainer(container, lesson) {
    trainerCurrentLessonData = lesson;
    const lessonId = lesson.id || 1;
    trainerCurrentLessonId = lessonId;
    const level = lesson.level || 'A1';
    
    loadTrainerState(lessonId);
    
    let templates = lesson.trainer || [];
    
    if (!templates || templates.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Для этого урока нет шаблонов для тренажёра.</div>
            </div>
        `;
        return;
    }

    allTrainerTemplates = [...templates];
    
    if (lesson.vocabulary && lesson.vocabulary.length >= 10) {
        allVocabWords = [...lesson.vocabulary];
        proceedWithRender(container);
    } else {
        loadAllVocabularyForLevel(level).then(words => {
            if (words && words.length > 0) {
                allVocabWords = words;
            } else {
                allVocabWords = lesson.vocabulary || [];
            }
            proceedWithRender(container);
        });
    }
}

function proceedWithRender(container) {
    if (allVocabWords.length < 5) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Недостаточно слов для тренажёра.</div>
                <div style="font-size: 14px; margin-top: 10px;">Нужно минимум 10 слов в словаре уровня.</div>
            </div>
        `;
        return;
    }
    
    const availableTemplates = allTrainerTemplates.filter(t => {
        const key = t.de + '|' + t.ru;
        return !trainerStudiedSentences[key];
    });
    
    let finalTemplates = availableTemplates;
    if (finalTemplates.length === 0) {
        finalTemplates = [...allTrainerTemplates];
        trainerStudiedSentences = {};
        localStorage.removeItem('dm_trainer_studied_' + trainerCurrentLessonId);
    }
    
    const shuffled = [...finalTemplates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    trainerSentences = shuffled;
    trainerIndex = 0;
    trainerDirection = 'ru_to_de';
    showTrainerSentence(container);
}

function getStudiedSentencesList() {
    if (!allTrainerTemplates) return [];
    return allTrainerTemplates.filter(sentence => {
        const key = sentence.de + '|' + sentence.ru;
        return trainerStudiedSentences[key] === true;
    });
}

function saveTrainerState() {
    try {
        localStorage.setItem('dm_trainer_studied_' + trainerCurrentLessonId, JSON.stringify(trainerStudiedSentences));
    } catch(e) {}
}

function loadTrainerState(lessonId) {
    try {
        const saved = localStorage.getItem('dm_trainer_studied_' + lessonId);
        if (saved) {
            trainerStudiedSentences = JSON.parse(saved);
        } else {
            trainerStudiedSentences = {};
        }
    } catch(e) {
        trainerStudiedSentences = {};
    }
}

function showTrainerContainer() {
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

    const studied = getStudiedSentencesList();
    const title = `📦 КОНТЕЙНЕР (${studied.length} фраз)`;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">${title}</h3>`;
    modalContent.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';
    
    if (studied.length === 0) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>`;
    } else {
        studied.forEach((sentence) => {
            const key = sentence.de + '|' + sentence.ru;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <span><strong>${sentence.de}</strong> — ${sentence.ru}</span>
                <button class="unstudy-btn" data-key="${key}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            
            const btn = item.querySelector('.unstudy-btn');
            btn.addEventListener('click', function() {
                const key = this.getAttribute('data-key');
                delete trainerStudiedSentences[key];
                saveTrainerState();
                
                const lesson = trainerCurrentLessonData || window.currentLesson;
                if (lesson) {
                    const templates = lesson.trainer || [];
                    trainerSentences = templates.filter(t => {
                        const k = t.de + '|' + t.ru;
                        return !trainerStudiedSentences[k];
                    });
                }
                
                if (trainerSentences.length === 0) {
                    const lesson2 = trainerCurrentLessonData || window.currentLesson;
                    if (lesson2) {
                        trainerSentences = [...lesson2.trainer];
                        trainerStudiedSentences = {};
                        localStorage.removeItem('dm_trainer_studied_' + trainerCurrentLessonId);
                    }
                }
                
                if (trainerIndex >= trainerSentences.length) {
                    trainerIndex = 0;
                }
                
                modal.remove();
                showTrainerContainer();
                const container = document.getElementById('modeContent');
                if (container) {
                    showTrainerSentence(container);
                }
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

    const returnAllBtn = document.getElementById('returnAllBtn');
    if (returnAllBtn) {
        returnAllBtn.addEventListener('click', function() {
            if (!confirm('Вернуть все фразы из контейнера?')) return;
            allTrainerTemplates.forEach(t => {
                const key = t.de + '|' + t.ru;
                delete trainerStudiedSentences[key];
            });
            saveTrainerState();
            trainerSentences = [...allTrainerTemplates];
            trainerIndex = 0;
            modal.remove();
            const container = document.getElementById('modeContent');
            if (container) {
                showTrainerSentence(container);
            }
        });
    }

    const closeBtn = document.getElementById('closeContainerBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
    }

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ФРАЗЫ ==========
function initializePhraseState() {
    const isRuToDe = trainerDirection === 'ru_to_de';
    const targetText = isRuToDe ? trainerCurrentSentence.de : trainerCurrentSentence.ru;
    
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
    
    ensureSixButtons();
    shuffleArray(_visibleWords);
    
    trainerHintIndex = 0;
    const isRuToDeHint = trainerDirection === 'ru_to_de';
    trainerHintWords = isRuToDeHint 
        ? trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/)
        : trainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);
}

// ========== ГАРАНТИРУЕМ 6 КНОПОК ==========
function ensureSixButtons() {
    const uniqueWords = [];
    const seenTexts = new Set();
    for (const w of _visibleWords) {
        const key = w.text.toLowerCase();
        if (!seenTexts.has(key) || w.isDistractor === false) {
            uniqueWords.push(w);
            seenTexts.add(key);
        }
    }
    _visibleWords = uniqueWords;
    
    while (_visibleWords.length > 6) {
        const distractorIndex = _visibleWords.findIndex(w => w.isDistractor === true);
        if (distractorIndex !== -1) {
            _visibleWords.splice(distractorIndex, 1);
        } else {
            _visibleWords.pop();
        }
    }
    
    while (_visibleWords.length < 6) {
        const newWord = getNextWord();
        if (newWord) {
            _visibleWords.push(newWord);
        } else {
            break;
        }
    }
}

// ========== ПОЛУЧИТЬ СЛЕДУЮЩЕЕ СЛОВО ==========
function getNextWord() {
    if (_wordQueue.length > 0) {
        const nextWord = _wordQueue.shift();
        return {
            ...nextWord,
            isDistractor: false,
            isUsed: false
        };
    }
    return getNextDistractor();
}

// ========== ПОДГРУЗКА ПРАВИЛЬНЫХ СЛОВ (ВОЛНАМИ) ==========
function refillCorrectWords() {
    const correctWordsOnButtons = _visibleWords.filter(w => !w.isDistractor).length;
    
    if (correctWordsOnButtons < 2 && _wordQueue.length > 0) {
        const needed = 3 - correctWordsOnButtons;
        const wordsToAdd = [];
        for (let i = 0; i < needed && _wordQueue.length > 0; i++) {
            wordsToAdd.push({
                ..._wordQueue.shift(),
                isDistractor: false,
                isUsed: false
            });
        }
        
        for (const w of wordsToAdd) {
            const randomIndex = Math.floor(Math.random() * (_visibleWords.length + 1));
            _visibleWords.splice(randomIndex, 0, w);
        }
        
        ensureSixButtons();
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ПУЛА ДИСТРАКТОРОВ ==========
function initDistractorPool() {
    const isRuToDe = trainerDirection === 'ru_to_de';
    
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
        const isRuToDe = trainerDirection === 'ru_to_de';
        const existingTexts = new Set(_visibleWords.map(v => v.text.toLowerCase()));
        
        for (const w of allVocabWords) {
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
}

// ========== ВЫБОР СЛОВА (ВСЕ СЛОВА ДОБАВЛЯЮТСЯ) ==========
function selectWord(wordId) {
    const wordIndex = _visibleWords.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return;
    
    const word = _visibleWords[wordIndex];
    if (word.isUsed) return;
    
    // ПОМЕЧАЕМ КАК ИСПОЛЬЗОВАННОЕ (любое слово — правильное или дистрактор)
    word.isUsed = true;
    _selectedWords.push(word);
    
    // Удаляем выбранное слово с его позиции
    _visibleWords.splice(wordIndex, 1);
    
    // Добавляем новое слово на случайную позицию
    const newWord = getNextWord();
    if (newWord) {
        const randomIndex = Math.floor(Math.random() * (_visibleWords.length + 1));
        _visibleWords.splice(randomIndex, 0, newWord);
    }
    
    // Если правильных слов осталось < 2 — подгружаем новые
    refillCorrectWords();
    
    // Убеждаемся, что кнопок ровно 6
    ensureSixButtons();
    
    // НЕТ ПЕРЕМЕШИВАНИЯ!
    updateTrainerDisplay();
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
    
    const isRuToDe = trainerDirection === 'ru_to_de';
    const existingTexts2 = new Set(_visibleWords.map(v => v.text.toLowerCase()));
    
    for (const w of allVocabWords) {
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
function updateTrainerDisplay() {
    const result = document.getElementById('trainerResult');
    const wordsContainer = document.getElementById('trainerWordsContainer');
    
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

// ========== ОСНОВНАЯ ЛОГИКА ОТОБРАЖЕНИЯ ФРАЗЫ ==========
function showTrainerSentence(container) {
    // Закольцовываем
    if (trainerIndex >= trainerSentences.length) {
        trainerIndex = 0;
    }

    trainerCurrentSentence = trainerSentences[trainerIndex];
    
    initializePhraseState();
    
    const isRuToDe = trainerDirection === 'ru_to_de';
    const questionText = isRuToDe ? trainerCurrentSentence.ru : trainerCurrentSentence.de;

    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="trainerDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                ${trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru'}
            </button>
        `;
    }

    let html = `
        <div style="text-align: center;">
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">${isRuToDe ? 'Составьте предложение на немецком:' : 'Составьте предложение на русском:'}</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-size: 20px; min-height: 60px; color: #CCCCCC; font-weight: normal;" id="trainerResult">
                Нажмите на слова, чтобы собрать предложение
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 500px; margin: 15px auto;" id="trainerWordsContainer">
                ${renderWordButtons()}
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0 5px 0;">
                <button class="ctrl-btn" id="trainerUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="trainerResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn" id="trainerCheckBtn" style="background: #3B6FE0 !important; color: white !important; border-color: #2B5BC7 !important;">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="trainerSpeakBtn">🔊 ОЗВУЧИТЬ</button>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 5px 0 15px 0;">
                <button class="ctrl-btn" id="trainerHintBtn">💡 ПОДСКАЗКА</button>
                <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 12px; padding: 10px 16px; flex: 1; min-width: 150px; font-size: 13px; color: #3B6FE0; font-weight: bold; text-align: center; min-height: 42px;" id="trainerHintLabel"></div>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 10px 0 5px 0;">
                <button class="ctrl-btn" id="trainerStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="trainerContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 5px 0 10px 0;">
                <button class="ctrl-btn" id="trainerPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                <button class="ctrl-btn" id="trainerNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="trainerResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                <div style="font-size: 14px; color: #888; display: flex; align-items: center; margin-left: 10px;" id="trainerCounter">${trainerIndex + 1} / ${trainerSentences.length}</div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    setTimeout(function() {
        attachTrainerEvents(container);
        updateTrainerDisplay();
    }, 50);
}

// ========== ПРИВЯЗКА СОБЫТИЙ ==========
function attachTrainerEvents(container) {
    const dirBtn = document.getElementById('trainerDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            showTrainerSentence(container);
        });
    }

    const undoBtn = document.getElementById('trainerUndoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', function() {
            if (_selectedWords.length === 0) return;
            
            const lastWord = _selectedWords.pop();
            // Возвращаем слово на кнопки (если оно там ещё не появилось)
            const exists = _visibleWords.some(w => w.text === lastWord.text && w.id !== lastWord.id);
            if (!exists) {
                _visibleWords.push({
                    ...lastWord,
                    isUsed: false
                });
            } else {
                // Если такое слово уже есть — возвращаем в очередь
                let inserted = false;
                for (let i = 0; i < _wordQueue.length; i++) {
                    if (_wordQueue[i].id > lastWord.id) {
                        _wordQueue.splice(i, 0, {
                            id: lastWord.id,
                            text: lastWord.text,
                            isUsed: false,
                            isDistractor: false
                        });
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    _wordQueue.push({
                        id: lastWord.id,
                        text: lastWord.text,
                        isUsed: false,
                        isDistractor: false
                    });
                }
            }
            
            ensureSixButtons();
            updateTrainerDisplay();
        });
    }

    const resetBtn = document.getElementById('trainerResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            initializePhraseState();
            ensureSixButtons();
            shuffleArray(_visibleWords);
            updateTrainerDisplay();
            document.getElementById('trainerHintLabel').textContent = '';
            trainerHintIndex = 0;
        });
    }

    const checkBtn = document.getElementById('trainerCheckBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            if (_selectedWords.length === 0) {
                const result = document.getElementById('trainerResult');
                result.style.backgroundColor = '#FFCDD2';
                setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
                return;
            }

            const userAnswer = _selectedWords.map(w => w.text).join(' ');
            const result = document.getElementById('trainerResult');
            const isRuToDe = trainerDirection === 'ru_to_de';
            const correctAnswerForCheck = isRuToDe ? trainerCurrentSentence.de : trainerCurrentSentence.ru;

            const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
            const normalizedCorrect = correctAnswerForCheck.replace(/[.,!?;:]/g, '').trim().toLowerCase();

            if (normalizedUser === normalizedCorrect) {
                result.style.backgroundColor = '#C8E6C9';
                result.textContent = '✅ ПРАВИЛЬНО!';
                
                // НЕ СОХРАНЯЕМ В КОНТЕЙНЕР!
                
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    trainerIndex++;
                    if (trainerIndex >= trainerSentences.length) {
                        trainerIndex = 0;
                    }
                    showTrainerSentence(container);
                }, 500);
            } else {
                result.style.backgroundColor = '#FFCDD2';
                result.textContent = '❌ Неправильно. Попробуйте снова.';
                
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    initializePhraseState();
                    ensureSixButtons();
                    shuffleArray(_visibleWords);
                    updateTrainerDisplay();
                    const hasWords = _selectedWords.length > 0;
                    const displayText = _selectedWords.map(w => w.text).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
                    result.textContent = displayText;
                    result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
                    result.style.fontWeight = hasWords ? 'bold' : 'normal';
                }, 800);
            }
        });
    }

    const speakBtn = document.getElementById('trainerSpeakBtn');
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            if (typeof window.speak === 'function') {
                window.speak(trainerCurrentSentence.de);
            }
        });
    }

    const hintBtn = document.getElementById('trainerHintBtn');
    if (hintBtn) {
        hintBtn.addEventListener('click', function() {
            const hintLabel = document.getElementById('trainerHintLabel');
            if (trainerHintIndex < trainerHintWords.length) {
                const currentHint = trainerHintWords.slice(0, trainerHintIndex + 1).join(' ');
                hintLabel.textContent = '💡 ' + currentHint;
                trainerHintIndex++;
            } else {
                hintLabel.textContent = '💡 Полное предложение: ' + trainerHintWords.join(' ');
            }
        });
    }

    const studyBtn = document.getElementById('trainerStudyBtn');
    if (studyBtn) {
        studyBtn.addEventListener('click', function() {
            if (trainerCurrentSentence) {
                const key = trainerCurrentSentence.de + '|' + trainerCurrentSentence.ru;
                trainerStudiedSentences[key] = true;
                saveTrainerState();
                
                const lesson = trainerCurrentLessonData || window.currentLesson;
                if (lesson) {
                    const templates = lesson.trainer || [];
                    trainerSentences = templates.filter(t => {
                        const k = t.de + '|' + t.ru;
                        return !trainerStudiedSentences[k];
                    });
                }
                
                if (trainerSentences.length === 0) {
                    trainerSentences = [...allTrainerTemplates];
                    trainerStudiedSentences = {};
                    localStorage.removeItem('dm_trainer_studied_' + trainerCurrentLessonId);
                }
                
                if (trainerIndex >= trainerSentences.length) {
                    trainerIndex = 0;
                }
                showTrainerSentence(container);
            }
        });
    }

    const containerBtn = document.getElementById('trainerContainerBtn');
    if (containerBtn) {
        containerBtn.addEventListener('click', function() {
            const studied = getStudiedSentencesList();
            if (!studied || studied.length === 0) {
                alert('📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.');
                return;
            }
            showTrainerContainer();
        });
    }

    const prevBtn = document.getElementById('trainerPrevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (trainerIndex > 0) {
                trainerIndex--;
                showTrainerSentence(container);
            }
        });
    }

    const nextBtn = document.getElementById('trainerNextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (trainerIndex + 1 < trainerSentences.length) {
                trainerIndex++;
                showTrainerSentence(container);
            }
        });
    }

    const resetStartBtn = document.getElementById('trainerResetStartBtn');
    if (resetStartBtn) {
        resetStartBtn.addEventListener('click', function() {
            if (trainerSentences.length > 0) {
                trainerIndex = 0;
                showTrainerSentence(container);
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

// ===== ЭКСПОРТ =====
window.renderTrainer = renderTrainer;

console.log('🧩 trainerMode.js загружен (6 КНОПОК, ВОЛНЫ, БЕЗ ПЕРЕМЕШИВАНИЯ ПРИ ВЫБОРЕ)');

})();
