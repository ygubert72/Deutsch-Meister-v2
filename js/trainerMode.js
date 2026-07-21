// ====================================================================
// trainerMode.js — Тренажёр (сборка фраз из слов) — ИСПРАВЛЕННАЯ ВЕРСИЯ
// ====================================================================

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerActiveWords = {};
let trainerHintIndex = 0;
let trainerHintWords = [];
let trainerDirection = 'ru_to_de';
let allVocabWords = [];
let trainerStudiedSentences = {};
let trainerCurrentLessonId = null;
let trainerCurrentLessonData = null;
let allTrainerTemplates = [];
let globalVocabularyCache = {};

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
    // ... (без изменений, тот же код, что был)
    // Я не буду дублировать его здесь для краткости, но он должен остаться таким же
}

// ========== ОСНОВНАЯ ЛОГИКА ОТОБРАЖЕНИЯ ФРАЗЫ (ИСПРАВЛЕНА) ==========
function showTrainerSentence(container) {
    if (trainerIndex >= trainerSentences.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                <div style="font-size: 24px; margin-bottom: 20px;">Поздравляем!</div>
                <div style="font-size: 16px; margin-bottom: 20px;">Вы завершили все предложения в тренажёре!</div>
                <button class="ctrl-btn" onclick="renderMode('trainer', window.currentLesson)" style="padding: 10px 30px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer;">НАЧАТЬ ЗАНОВО</button>
            </div>
        `;
        return;
    }

    trainerCurrentSentence = trainerSentences[trainerIndex];
    
    const isRuToDe = trainerDirection === 'ru_to_de';
    
    // Разбиваем на слова
    const deWords = trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = trainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);

    // ===== ИСПРАВЛЕНО: правильные слова с уникальными ID =====
    const correctWords = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true,
        originalIndex: i,
        id: ++_trainerWordIdCounter
    }));

    // ===== ИСПРАВЛЕНО: для дистракторов используем слова на нужном языке =====
    // Собираем все возможные слова для дистракторов (на нужном языке)
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
        // Берём из allVocabWords, но используем ru как display
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
            id: ++_trainerWordIdCounter
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
            id: ++_trainerWordIdCounter
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
                id: ++_trainerWordIdCounter
            });
        } else {
            break;
        }
    }
    
    const allWordsForChoice = finalAll;
    
    // Перемешиваем
    for (let i = allWordsForChoice.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWordsForChoice[i], allWordsForChoice[j]] = [allWordsForChoice[j], allWordsForChoice[i]];
    }

    // Сбрасываем состояние
    trainerSelectedWords = [];
    trainerAvailableWords = allWordsForChoice;
    trainerActiveWords = {};
    trainerAvailableWords.forEach(w => { 
        trainerActiveWords[w.id] = true; 
    });
    trainerHintIndex = 0;
    trainerHintWords = deWords;

    // Вопрос — на каком языке показываем?
    const questionText = isRuToDe ? trainerCurrentSentence.ru : trainerCurrentSentence.de;

    const hasWords = trainerSelectedWords.length > 0;
    const displayText = trainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
    const textColor = hasWords ? '#1A1A1A' : '#CCCCCC';
    const fontWeight = hasWords ? 'bold' : 'normal';

    // Обновляем кнопку направления в header
    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="trainerDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                ${trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru'}
            </button>
        `;
        const dirBtn = document.getElementById('trainerDirBtn');
        if (dirBtn) {
            dirBtn.replaceWith(dirBtn.cloneNode(true));
            const newDirBtn = document.getElementById('trainerDirBtn');
            newDirBtn.addEventListener('click', function() {
                trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
                this.textContent = trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
                _trainerWordIdCounter = 0;
                showTrainerSentence(container);
            });
        }
    }

    let html = `
        <div style="text-align: center;">
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">${isRuToDe ? 'Составьте предложение на немецком:' : 'Составьте предложение на русском:'}</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-size: 20px; min-height: 60px; color: ${textColor}; font-weight: ${fontWeight};" id="trainerResult">
                ${displayText}
            </div>
            
            <!-- КОНТЕЙНЕР ДЛЯ СЛОВ -->
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; max-width: 700px; margin: 15px auto;" id="trainerWordsContainer">
                ${trainerAvailableWords.map(word => {
                    const isActive = trainerActiveWords[word.id];
                    return `
                        <button class="word-btn" data-word-id="${word.id}" style="padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 40px; ${!isActive ? 'opacity: 0.4; pointer-events: none;' : ''}">
                            ${word.display}
                        </button>
                    `;
                }).join('')}
            </div>
            
            <!-- РЯД 1: ВЕРНУТЬ СЛОВО + СБРОСИТЬ ВСЁ + ПРОВЕРИТЬ + ОЗВУЧИТЬ -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0 5px 0;">
                <button class="ctrl-btn" id="trainerUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="trainerResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn" id="trainerCheckBtn" style="background: #3B6FE0 !important; color: white !important; border-color: #2B5BC7 !important;">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="trainerSpeakBtn">🔊 ОЗВУЧИТЬ</button>
            </div>
            
            <!-- РЯД 2: ПОДСКАЗКА + поле подсказки -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 5px 0 15px 0;">
                <button class="ctrl-btn" id="trainerHintBtn">💡 ПОДСКАЗКА</button>
                <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 12px; padding: 10px 16px; flex: 1; min-width: 150px; font-size: 13px; color: #3B6FE0; font-weight: bold; text-align: center; min-height: 42px;" id="trainerHintLabel"></div>
            </div>
            
            <!-- РЯД 3: ИЗУЧЕНО + В КОНТЕЙНЕР -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 10px 0 5px 0;">
                <button class="ctrl-btn" id="trainerStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="trainerContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
            </div>
            
            <!-- РЯД 4: НАЗАД + ВПЕРЕД + В НАЧАЛО + счетчик -->
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
    // (без изменений, тот же код, что был)
    // ...
}

function updateTrainerDisplay(container) {
    // (без изменений)
}

// ===== ЭКСПОРТ =====
window.renderTrainer = renderTrainer;

console.log('🧩 trainerMode.js загружен (ИСПРАВЛЕННАЯ ВЕРСИЯ)');
