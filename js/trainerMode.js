// ====================================================================
// trainerMode.js — Тренажёр (сборка фраз из слов) — ВОЛНОВОЙ ПРИНЦИП
// ====================================================================

(function() {

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerHintIndex = 0;
let trainerHintWords = [];
let trainerDirection = 'ru_to_de';
let allVocabWords = [];
let trainerStudiedSentences = {};
let trainerCurrentLessonId = null;
let trainerCurrentLessonData = null;
let allTrainerTemplates = [];
let globalVocabularyCache = {};

// ===== ОЧЕРЕДЬ ДЛЯ ПОДГРУЗКИ =====
let _trainerWordQueue = [];

// Счётчик для генерации уникальных ID
let _trainerWordIdCounter = 0;

// ========== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ==========
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
    _trainerWordIdCounter = 0;
    _trainerWordQueue = [];
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

    function renderContainerContent() {
        const studied = getStudiedSentencesList();
        
        const header = document.createElement('div');
        header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
        header.innerHTML = `<h3 style="margin: 0;">📦 КОНТЕЙНЕР (${studied.length} фраз)</h3>`;
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

    renderContainerContent();
}

// ========== ВСТАВКА СЛОВА В СЛУЧАЙНУЮ ПОЗИЦИЮ ==========
function insertWordAtRandomPosition(words, word) {
    const pos = Math.floor(Math.random() * (words.length + 1));
    words.splice(pos, 0, word);
    return pos;
}

// ========== ВОССТАНОВЛЕНИЕ ОЧЕРЕДИ (ИСПРАВЛЕНО) ==========
function restoreTrainerQueue() {
    // Если trainerHintWords пустая — берём из текущего предложения
    let hintWords = trainerHintWords;
    if (!hintWords || hintWords.length === 0) {
        if (trainerCurrentSentence) {
            hintWords = trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
        } else {
            return;
        }
    }
    
    const allCorrectWords = hintWords.map(w => ({
        display: w,
        de: w,
        ru: w,
        isCorrect: true,
        originalIndex: -1
    }));
    
    const usedDisplaySet = new Set(trainerAvailableWords.map(w => w.display));
    const missingCorrectWords = allCorrectWords.filter(w => !usedDisplaySet.has(w.display));
    
    _trainerWordQueue = [];
    missingCorrectWords.forEach(w => {
        _trainerWordQueue.push({
            id: ++_trainerWordIdCounter,
            display: w.display,
            de: w.de,
            ru: w.ru,
            isCorrect: true,
            originalIndex: -1
        });
    });
}

// ========== ГАРАНТИЯ ПРАВИЛЬНЫХ СЛОВ НА КНОПКАХ (ИСПРАВЛЕНО) ==========
function ensureCorrectWordsOnButtons() {
    // Если нет слов — выходим
    if (!trainerAvailableWords || trainerAvailableWords.length === 0) {
        return;
    }
    
    // Считаем правильные слова на кнопках
    let correctOnButtons = trainerAvailableWords.filter(w => w.isCorrect).length;
    
    // Если правильных слов меньше 3, добавляем из очереди
    while (correctOnButtons < 3 && _trainerWordQueue.length > 0) {
        const queued = _trainerWordQueue.shift();
        const newWord = {
            display: queued.display,
            de: queued.de,
            ru: queued.ru,
            isCorrect: true,
            originalIndex: queued.originalIndex,
            id: ++_trainerWordIdCounter
        };
        // Удаляем один дистрактор
        const distractorIdx = trainerAvailableWords.findIndex(w => !w.isCorrect);
        if (distractorIdx !== -1) {
            trainerAvailableWords.splice(distractorIdx, 1);
        }
        insertWordAtRandomPosition(trainerAvailableWords, newWord);
        correctOnButtons++;
    }
}

// ========== ОСНОВНАЯ ЛОГИКА ОТОБРАЖЕНИЯ ФРАЗЫ (ИСПРАВЛЕНО) ==========
function showTrainerSentence(container) {
    // ===== ПРОВЕРКА: если нет предложений — выходим =====
    if (!trainerSentences || trainerSentences.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Нет предложений для тренажёра</div>';
        return;
    }
    
    // ===== ЗАКОЛЬЦОВКА =====
    if (trainerIndex >= trainerSentences.length) {
        trainerIndex = 0;
    }

    trainerCurrentSentence = trainerSentences[trainerIndex];
    const isRuToDe = trainerDirection === 'ru_to_de';
    
    // Разбиваем на слова
    const deWords = trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = trainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);

    // ===== ПРАВИЛЬНЫЕ СЛОВА (ОБЯЗАТЕЛЬНО ДОБАВЛЯЕМ) =====
    const correctWords = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true,
        originalIndex: i,
        id: ++_trainerWordIdCounter
    }));

    // Сохраняем правильные слова для подсказки и восстановления
    trainerHintWords = deWords;

    // ===== ДИСТРАКТОРЫ =====
    let allDistractorWords = [];
    
    if (isRuToDe) {
        allDistractorWords = allVocabWords.map(w => ({
            display: w.de,
            de: w.de,
            ru: w.ru || w.de,
            isCorrect: false
        }));
    } else {
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
    
    // Множество правильных слов (для исключения из дистракторов)
    const correctSet = new Set(
        correctWords.map(w => w.display.toLowerCase().replace(/[.,!?;:]/g, ''))
    );
    
    // Фильтруем дистракторы (убираем те, что совпадают с правильными)
    const filteredDistractors = shuffledDistractors
        .filter(w => {
            const key = w.display.toLowerCase().replace(/[.,!?;:]/g, '');
            return !correctSet.has(key) && key.length > 0;
        });

    // ===== ФОРМИРУЕМ 6 КНОПОК =====
    // БЕРЁМ ВСЕ ПРАВИЛЬНЫЕ СЛОВА (не больше 3 на кнопки, остальные в очередь)
    let visibleCorrectWords = [];
    let remainingCorrectWords = [];
    
    if (correctWords.length <= 3) {
        visibleCorrectWords = [...correctWords];
        remainingCorrectWords = [];
    } else {
        visibleCorrectWords = correctWords.slice(0, 3);
        remainingCorrectWords = correctWords.slice(3);
    }

    // Очередь для подгрузки
    _trainerWordQueue = remainingCorrectWords.map(w => ({
        id: ++_trainerWordIdCounter,
        display: w.display,
        de: w.de,
        ru: w.ru,
        isCorrect: true,
        originalIndex: w.originalIndex
    }));

    // НАЧИНАЕМ С ПРАВИЛЬНЫХ СЛОВ
    let finalAll = [];
    visibleCorrectWords.forEach(w => {
        finalAll.push({
            ...w,
            id: w.id
        });
    });
    
    // ДОБАВЛЯЕМ ДИСТРАКТОРЫ ДО 6
    const maxTotal = 6;
    const needed = Math.max(0, maxTotal - finalAll.length);
    const selectedDistractors = filteredDistractors.slice(0, needed);
    
    selectedDistractors.forEach(d => {
        finalAll.push({
            display: d.display,
            de: d.de,
            ru: d.ru,
            isCorrect: false,
            originalIndex: -1,
            id: --_trainerWordIdCounter
        });
    });
    
    // Если всё ещё не хватает слов, добавляем случайные
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
                id: --_trainerWordIdCounter
            });
        }
        distractorIndex++;
    }
    
    // ПЕРЕМЕШИВАНИЕ ТОЛЬКО ПРИ ИНИЦИАЛИЗАЦИИ
    for (let i = finalAll.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalAll[i], finalAll[j]] = [finalAll[j], finalAll[i]];
    }

    // Сохраняем состояние
    trainerSelectedWords = [];
    trainerAvailableWords = finalAll;
    trainerHintIndex = 0;

    // ===== ГАРАНТИЯ: ПРОВЕРЯЕМ, ЧТО ПРАВИЛЬНЫЕ СЛОВА ЕСТЬ =====
    ensureCorrectWordsOnButtons();

    // Вопрос
    const questionText = isRuToDe ? trainerCurrentSentence.ru : trainerCurrentSentence.de;

    // Обновляем кнопку направления в header
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
            
            <div class="words-container" id="trainerWordsContainer">
                ${trainerAvailableWords.map(word => `
                    <button class="word-btn" data-word-id="${word.id}">
                        ${word.display}
                    </button>
                `).join('')}
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

    // ===== ПРИВЯЗКА ОБРАБОТЧИКОВ =====
    attachTrainerEvents(container);
}

function attachTrainerEvents(container) {
    const dirBtn = document.getElementById('trainerDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            _trainerWordIdCounter = 0;
            _trainerWordQueue = [];
            showTrainerSentence(container);
        });
    }

    const wordsContainer = document.getElementById('trainerWordsContainer');
    if (wordsContainer) {
        wordsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.word-btn');
            if (!btn) return;
            const wordId = parseInt(btn.dataset.wordId);
            if (isNaN(wordId)) return;
            
            const wordIndex = trainerAvailableWords.findIndex(w => w.id === wordId);
            if (wordIndex === -1) return;
            
            const selectedWord = trainerAvailableWords[wordIndex];
            
            // 1. Удаляем выбранное слово
            trainerAvailableWords.splice(wordIndex, 1);
            
            // 2. Добавляем в выбранные
            trainerSelectedWords.push(selectedWord);
            
            // 3. Обновляем результат
            updateTrainerResultDisplay();
            
            // 4. Подбираем слово для замены
            let replacementWord = null;
            
            if (_trainerWordQueue.length > 0) {
                const queued = _trainerWordQueue.shift();
                replacementWord = {
                    display: queued.display,
                    de: queued.de,
                    ru: queued.ru,
                    isCorrect: true,
                    originalIndex: queued.originalIndex,
                    id: ++_trainerWordIdCounter
                };
            } else {
                const usedDisplaySet = new Set(trainerAvailableWords.map(w => w.display));
                const availableDistractors = allVocabWords
                    .filter(w => {
                        const display = trainerDirection === 'ru_to_de' ? w.de : (w.ru || w.de);
                        return !usedDisplaySet.has(display) && display.length > 0;
                    })
                    .map(w => ({
                        display: trainerDirection === 'ru_to_de' ? w.de : (w.ru || w.de),
                        de: w.de,
                        ru: w.ru || w.de,
                        isCorrect: false,
                        originalIndex: -1,
                        id: --_trainerWordIdCounter
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
                        id: --_trainerWordIdCounter
                    };
                }
            }
            
            // 5. Вставляем замену
            if (replacementWord) {
                insertWordAtRandomPosition(trainerAvailableWords, replacementWord);
            }
            
            // ===== ЖЁСТКО ОБРЕЗАЕМ ДО 6 =====
            if (trainerAvailableWords.length > 6) {
                trainerAvailableWords = trainerAvailableWords.slice(0, 6);
            }
            
            // 6. Перерисовываем
            renderTrainerWords();
        });
    }

    const undoBtn = document.getElementById('trainerUndoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', function() {
            if (trainerSelectedWords.length > 0) {
                const lastWord = trainerSelectedWords.pop();
                const wordWithNewId = {
                    ...lastWord,
                    id: ++_trainerWordIdCounter
                };
                insertWordAtRandomPosition(trainerAvailableWords, wordWithNewId);
                if (trainerAvailableWords.length > 6) {
                    trainerAvailableWords = trainerAvailableWords.slice(0, 6);
                }
                restoreTrainerQueue();
                updateTrainerResultDisplay();
                renderTrainerWords();
            }
        });
    }

    const resetBtn = document.getElementById('trainerResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            while (trainerSelectedWords.length > 0) {
                const word = trainerSelectedWords.pop();
                const wordWithNewId = {
                    ...word,
                    id: ++_trainerWordIdCounter
                };
                insertWordAtRandomPosition(trainerAvailableWords, wordWithNewId);
            }
            restoreTrainerQueue();
            if (trainerAvailableWords.length > 6) {
                trainerAvailableWords = trainerAvailableWords.slice(0, 6);
            }
            updateTrainerResultDisplay();
            renderTrainerWords();
            document.getElementById('trainerHintLabel').textContent = '';
            trainerHintIndex = 0;
        });
    }

    const checkBtn = document.getElementById('trainerCheckBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            if (trainerSelectedWords.length === 0) {
                const result = document.getElementById('trainerResult');
                result.style.backgroundColor = '#FFCDD2';
                setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
                return;
            }

            const userAnswer = trainerSelectedWords.map(w => w.display).join(' ');
            const result = document.getElementById('trainerResult');
            
            const isRuToDe = trainerDirection === 'ru_to_de';
            const correctAnswerForCheck = isRuToDe ? trainerCurrentSentence.de : trainerCurrentSentence.ru;

            const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
            const normalizedCorrect = correctAnswerForCheck.replace(/[.,!?;:]/g, '').trim().toLowerCase();

            if (normalizedUser === normalizedCorrect) {
                result.style.backgroundColor = '#C8E6C9';
                result.textContent = '✅ ПРАВИЛЬНО!';
                
                const key = trainerCurrentSentence.de + '|' + trainerCurrentSentence.ru;
                trainerStudiedSentences[key] = true;
                saveTrainerState();
                
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    trainerIndex++;
                    _trainerWordIdCounter = 0;
                    _trainerWordQueue = [];
                    showTrainerSentence(container);
                }, 500);
            } else {
                result.style.backgroundColor = '#FFCDD2';
                result.textContent = '❌ Неправильно. Попробуйте снова.';
                
                setTimeout(() => {
                    result.style.backgroundColor = '#FFFFFF';
                    while (trainerSelectedWords.length > 0) {
                        const word = trainerSelectedWords.pop();
                        const wordWithNewId = {
                            ...word,
                            id: ++_trainerWordIdCounter
                        };
                        insertWordAtRandomPosition(trainerAvailableWords, wordWithNewId);
                    }
                    restoreTrainerQueue();
                    if (trainerAvailableWords.length > 6) {
                        trainerAvailableWords = trainerAvailableWords.slice(0, 6);
                    }
                    updateTrainerResultDisplay();
                    renderTrainerWords();
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
                    document.getElementById('trainerResult').textContent = '🎉 Все фразы изучены!';
                    document.getElementById('trainerWordsContainer').innerHTML = '';
                    document.getElementById('trainerPrevBtn').disabled = true;
                    document.getElementById('trainerNextBtn').disabled = true;
                    document.getElementById('trainerStudyBtn').disabled = true;
                    document.getElementById('trainerContainerBtn').disabled = true;
                    return;
                }
                
                if (trainerIndex >= trainerSentences.length) {
                    trainerIndex = 0;
                }
                _trainerWordIdCounter = 0;
                _trainerWordQueue = [];
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
                _trainerWordIdCounter = 0;
                _trainerWordQueue = [];
                showTrainerSentence(container);
            }
        });
    }

    const nextBtn = document.getElementById('trainerNextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (trainerIndex + 1 < trainerSentences.length) {
                trainerIndex++;
                _trainerWordIdCounter = 0;
                _trainerWordQueue = [];
                showTrainerSentence(container);
            }
        });
    }

    const resetStartBtn = document.getElementById('trainerResetStartBtn');
    if (resetStartBtn) {
        resetStartBtn.addEventListener('click', function() {
            if (trainerSentences.length > 0) {
                trainerIndex = 0;
                _trainerWordIdCounter = 0;
                _trainerWordQueue = [];
                showTrainerSentence(container);
            }
        });
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function updateTrainerResultDisplay() {
    const result = document.getElementById('trainerResult');
    if (result) {
        const hasWords = trainerSelectedWords.length > 0;
        const displayText = trainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.fontWeight = hasWords ? 'bold' : 'normal';
        result.style.backgroundColor = '#FFFFFF';
    }
}

function renderTrainerWords() {
    const wordsContainer = document.getElementById('trainerWordsContainer');
    if (!wordsContainer) return;
    
    wordsContainer.innerHTML = '';
    trainerAvailableWords.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'word-btn';
        btn.textContent = word.display;
        btn.dataset.wordId = word.id;
        wordsContainer.appendChild(btn);
    });
}

// ===== ЭКСПОРТ =====
window.renderTrainer = renderTrainer;

console.log('🧩 trainerMode.js загружен (ВОЛНОВОЙ ПРИНЦИП)');

})();
