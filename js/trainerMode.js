// ====================================================================
// trainerMode.js — Тренажёр (12 слов, сетка 6×2)
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

// ===== КОНТЕЙНЕР ДЛЯ ИЗУЧЕННЫХ ФРАЗ =====
let trainerStudiedSentences = {};
let currentLessonId = null;

// ===== ЗАГРУЗКА ВСЕХ СЛОВ ИЗ ПРОЙДЕННЫХ УРОКОВ =====
async function loadAllVocabulary(level, currentLessonId) {
    try {
        const response = await fetch(`docs/course/${level}/index.json`);
        if (!response.ok) throw new Error('Курс не найден');
        const courseData = await response.json();
        
        let allWords = [];
        
        for (const lessonInfo of courseData.lessons) {
            if (lessonInfo.id > currentLessonId) break;
            
            try {
                const lessonResponse = await fetch(`docs/course/${level}/lessons/${lessonInfo.file}`);
                if (lessonResponse.ok) {
                    const lessonData = await lessonResponse.json();
                    if (lessonData.vocabulary) {
                        allWords = allWords.concat(lessonData.vocabulary);
                    }
                }
            } catch(e) {
                console.warn('Не удалось загрузить урок:', lessonInfo.id);
            }
        }
        
        return allWords;
    } catch(e) {
        console.error('Ошибка загрузки лексики:', e);
        return [];
    }
}

// ===== ПОЛУЧЕНИЕ СПИСКА ИЗУЧЕННЫХ ФРАЗ =====
function getStudiedSentencesList() {
    const templates = window.currentLesson?.trainer?.templates || [];
    return templates.filter(sentence => {
        const key = sentence.de + '|' + sentence.ru;
        return trainerStudiedSentences[key];
    });
}

// ===== СОХРАНЕНИЕ СОСТОЯНИЯ ИЗУЧЕННЫХ ФРАЗ =====
function saveTrainerState() {
    try {
        localStorage.setItem('dm_trainer_studied_' + currentLessonId, JSON.stringify(trainerStudiedSentences));
    } catch(e) {}
}

// ===== ЗАГРУЗКА СОСТОЯНИЯ ИЗУЧЕННЫХ ФРАЗ =====
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

// ===== ОТОБРАЖЕНИЕ КОНТЕЙНЕРА ИЗУЧЕННЫХ ФРАЗ =====
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
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000000;
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
        overflow-y: auto;
    `;

    function renderContainerContent() {
        const studied = getStudiedSentencesList();
        let html = `
            <div style="padding: 15px; border-bottom: 1px solid #ddd; text-align: center;">
                <h3 style="margin: 0;">📦 КОНТЕЙНЕР (${studied.length} фраз)</h3>
            </div>
            <div style="padding: 10px 0; overflow-y: auto; flex: 1;" id="containerItems">
        `;

        if (studied.length === 0) {
            html += `<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>`;
        } else {
            studied.forEach((sentence) => {
                const key = sentence.de + '|' + sentence.ru;
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #eee;">
                        <span><strong>${sentence.de}</strong> — ${sentence.ru}</span>
                        <button class="unstudy-btn" data-key="${key}" style="padding: 4px 12px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px;">✕ ВЕРНУТЬ</button>
                    </div>
                `;
            });
        }

        html += `
            </div>
            <div style="padding: 15px; border-top: 1px solid #ddd; display: flex; gap: 10px;">
                <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 ВЕРНУТЬ ВСЁ</button>
                <button id="closeContainerBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer;">ЗАКРЫТЬ</button>
            </div>
        `;

        modalContent.innerHTML = html;
        modal.appendChild(modalContent);

        // Обработчики для кнопок "ВЕРНУТЬ"
        modalContent.querySelectorAll('.unstudy-btn').forEach(btn => {
            btn.onclick = function() {
                const key = this.getAttribute('data-key');
                delete trainerStudiedSentences[key];
                saveTrainerState();
                
                // Обновляем список заданий
                const templates = window.currentLesson?.trainer?.templates || [];
                const allSentences = templates.map(t => t.de + '|' + t.ru);
                trainerSentences = templates.filter(t => {
                    const key = t.de + '|' + t.ru;
                    return !trainerStudiedSentences[key];
                });
                
                if (trainerSentences.length === 0) {
                    trainerSentences = [...templates];
                    trainerStudiedSentences = {};
                    localStorage.removeItem('dm_trainer_studied_' + currentLessonId);
                }
                
                if (trainerIndex >= trainerSentences.length) {
                    trainerIndex = 0;
                }
                
                renderContainerContent();
                showTrainerSentence(document.getElementById('modeContent'));
            };
        });

        document.getElementById('returnAllBtn').onclick = function() {
            if (!confirm('Вернуть все фразы из контейнера?')) return;
            const templates = window.currentLesson?.trainer?.templates || [];
            templates.forEach(t => {
                const key = t.de + '|' + t.ru;
                delete trainerStudiedSentences[key];
            });
            saveTrainerState();
            trainerSentences = [...templates];
            trainerIndex = 0;
            modal.remove();
            showTrainerSentence(document.getElementById('modeContent'));
        };

        document.getElementById('closeContainerBtn').onclick = function() {
            modal.remove();
        };

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }

    renderContainerContent();
}

// ===== ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРИНГА =====
function renderTrainer(container, lesson) {
    const lessonId = lesson.id || 1;
    currentLessonId = lessonId;
    
    // Загружаем состояние изученных фраз
    loadTrainerState(lessonId);
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 15px;">⏳</div>
            <div>Загрузка слов для тренажёра...</div>
        </div>
    `;
    
    const templates = lesson.trainer?.templates || [];
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Для этого урока нет шаблонов для тренажёра.</div>
            </div>
        `;
        return;
    }
    
    // Фильтруем уже изученные фразы
    const availableTemplates = templates.filter(t => {
        const key = t.de + '|' + t.ru;
        return !trainerStudiedSentences[key];
    });
    
    // Если все фразы изучены, показываем все заново
    let finalTemplates = availableTemplates;
    if (finalTemplates.length === 0) {
        finalTemplates = [...templates];
        trainerStudiedSentences = {};
        localStorage.removeItem('dm_trainer_studied_' + lessonId);
    }
    
    loadAllVocabulary(currentLevel, lessonId).then(vocab => {
        allVocabWords = vocab;
        
        if (allVocabWords.length < 5) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                    <div>Недостаточно слов для тренажёра.</div>
                    <div style="font-size: 14px; margin-top: 10px;">Пройдите больше уроков, чтобы увеличить количество слов.</div>
                </div>
            `;
            return;
        }
        
        if (finalTemplates.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                    <div>Нет шаблонов для тренажёра.</div>
                    <div style="font-size: 14px; margin-top: 10px;">Попробуйте другой урок.</div>
                </div>
            `;
            return;
        }
        
        // Перемешиваем задания
        const shuffled = [...finalTemplates];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        trainerSentences = shuffled;
        trainerIndex = 0;
        trainerDirection = 'ru_to_de';
        showTrainerSentence(container);
    }).catch(e => {
        console.error('Ошибка загрузки слов:', e);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <div>Ошибка загрузки слов для тренажёра.</div>
                <div style="font-size: 14px; margin-top: 10px;">${e.message}</div>
            </div>
        `;
    });
}

// ===== ОТОБРАЖЕНИЕ ТЕКУЩЕГО ЗАДАНИЯ =====
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
    
    const deWords = trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = trainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);

    const correctWords = deWords.map((w, i) => ({
        display: isRuToDe ? w : (ruWords[i] || w),
        de: w,
        ru: ruWords[i] || w,
        isCorrect: true,
        originalIndex: i
    }));

    const allWords = [...allVocabWords];
    const shuffledAll = [...allWords];
    for (let i = shuffledAll.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]];
    }
    
    const correctSet = new Set(deWords.map(w => w.toLowerCase()));
    const distractors = shuffledAll
        .filter(w => {
            const key = w.de.toLowerCase().replace(/[.,!?;:]/g, '');
            return !correctSet.has(key) && key.length > 0;
        })
        .slice(0, 12 - deWords.length)
        .map(w => ({
            display: isRuToDe ? w.de : w.ru,
            de: w.de,
            ru: w.ru,
            isCorrect: false,
            originalIndex: -1
        }));

    const allWordsForChoice = [...correctWords, ...distractors];
    for (let i = allWordsForChoice.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWordsForChoice[i], allWordsForChoice[j]] = [allWordsForChoice[j], allWordsForChoice[i]];
    }

    trainerSelectedWords = [];
    trainerAvailableWords = allWordsForChoice;
    trainerActiveWords = {};
    trainerAvailableWords.forEach(w => { trainerActiveWords[w.display] = true; });
    trainerHintIndex = 0;
    trainerHintWords = deWords;

    const questionText = isRuToDe ? trainerCurrentSentence.ru : trainerCurrentSentence.de;

    const hasWords = trainerSelectedWords.length > 0;
    const displayText = trainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
    const textColor = hasWords ? '#1A1A1A' : '#CCCCCC';
    const fontWeight = hasWords ? 'bold' : 'normal';

    // ===== КНОПКА НАПРАВЛЕНИЯ В ШАПКЕ =====
    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="trainerDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru'}
            </button>
        `;
        document.getElementById('trainerDirBtn').onclick = function() {
            trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            showTrainerSentence(container);
        };
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
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; max-width: 700px; margin: 15px auto;" id="trainerWordsContainer">
                ${trainerAvailableWords.map(word => `
                    <button class="word-btn" data-word="${word.display}" style="padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 40px; ${!trainerActiveWords[word.display] ? 'opacity: 0.4; pointer-events: none;' : ''}">
                        ${word.display}
                    </button>
                `).join('')}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0;">
                <button class="ctrl-btn" id="trainerUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="trainerResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn check-btn" id="trainerCheckBtn">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="trainerSpeakBtn">🔊 ОЗВУЧИТЬ</button>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0;">
                <button class="ctrl-btn" id="trainerHintBtn">💡 ПОДСКАЗКА</button>
                <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 12px; padding: 10px 16px; flex: 1; min-width: 150px; font-size: 13px; color: #3B6FE0; font-weight: bold; text-align: center; min-height: 42px;" id="trainerHintLabel"></div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0;">
                <button class="ctrl-btn" id="trainerStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="trainerContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="trainerPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                <button class="ctrl-btn" id="trainerNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="trainerResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                <div style="font-size: 14px; color: #888; display: flex; align-items: center; margin-left: 10px;">${trainerIndex + 1} / ${trainerSentences.length}</div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // ===== ОБРАБОТЧИКИ КНОПОК =====

    // Слова для выбора
    container.querySelectorAll('#trainerWordsContainer .word-btn').forEach(btn => {
        btn.onclick = function() {
            const word = this.getAttribute('data-word');
            if (trainerActiveWords[word]) {
                trainerActiveWords[word] = false;
                const foundWord = trainerAvailableWords.find(w => w.display === word);
                if (foundWord) {
                    trainerSelectedWords.push(foundWord);
                    updateTrainerDisplay(container);
                }
            }
        };
    });

    // Вернуть слово
    document.getElementById('trainerUndoBtn').onclick = function() {
        if (trainerSelectedWords.length > 0) {
            const lastWord = trainerSelectedWords.pop();
            trainerActiveWords[lastWord.display] = true;
            updateTrainerDisplay(container);
        }
    };

    // Сбросить всё
    document.getElementById('trainerResetBtn').onclick = function() {
        trainerSelectedWords = [];
        trainerAvailableWords.forEach(w => { trainerActiveWords[w.display] = true; });
        updateTrainerDisplay(container);
        document.getElementById('trainerHintLabel').textContent = '';
        trainerHintIndex = 0;
    };

    // Проверить
    document.getElementById('trainerCheckBtn').onclick = function() {
        if (trainerSelectedWords.length === 0) {
            const result = document.getElementById('trainerResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }

        const userAnswer = trainerSelectedWords.map(w => w.display).join(' ');
        const result = document.getElementById('trainerResult');
        const correctAnswerForCheck = isRuToDe ? trainerCurrentSentence.de : trainerCurrentSentence.ru;

        const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim();
        const normalizedCorrect = correctAnswerForCheck.replace(/[.,!?;:]/g, '').trim();

        if (normalizedUser === normalizedCorrect) {
            result.style.backgroundColor = '#C8E6C9';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                // Отмечаем как изученное, но не переходим автоматически
                // Пользователь сам решит, нажать "ИЗУЧЕНО" или перейти дальше
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            trainerSelectedWords.forEach(w => { trainerActiveWords[w.display] = true; });
            trainerSelectedWords = [];
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                updateTrainerDisplay(container);
            }, 500);
        }
    };

    // Озвучить
    document.getElementById('trainerSpeakBtn').onclick = function() {
        speak(trainerCurrentSentence.de);
    };

    // Подсказка
    document.getElementById('trainerHintBtn').onclick = function() {
        const hintLabel = document.getElementById('trainerHintLabel');
        if (trainerHintIndex < trainerHintWords.length) {
            const currentHint = trainerHintWords.slice(0, trainerHintIndex + 1).join(' ');
            hintLabel.textContent = '💡 ' + currentHint;
            trainerHintIndex++;
        } else {
            hintLabel.textContent = '💡 Полное предложение: ' + trainerHintWords.join(' ');
        }
    };

    // ===== НОВЫЕ КНОПКИ =====

    // ИЗУЧЕНО
    document.getElementById('trainerStudyBtn').onclick = function() {
        if (trainerCurrentSentence) {
            const key = trainerCurrentSentence.de + '|' + trainerCurrentSentence.ru;
            trainerStudiedSentences[key] = true;
            saveTrainerState();
            
            // Удаляем из текущего списка
            trainerSentences = trainerSentences.filter(t => {
                const k = t.de + '|' + t.ru;
                return k !== key;
            });
            
            if (trainerSentences.length === 0) {
                // Если все фразы изучены
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
            showTrainerSentence(container);
        }
    };

    // В КОНТЕЙНЕР
    document.getElementById('trainerContainerBtn').onclick = function() {
        const studied = getStudiedSentencesList();
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.');
            return;
        }
        showTrainerContainer();
    };

    // НАЗАД
    document.getElementById('trainerPrevBtn').onclick = function() {
        if (trainerIndex > 0) {
            trainerIndex--;
            showTrainerSentence(container);
        }
    };

    // ВПЕРЕД
    document.getElementById('trainerNextBtn').onclick = function() {
        if (trainerIndex + 1 < trainerSentences.length) {
            trainerIndex++;
            showTrainerSentence(container);
        }
    };

    // В НАЧАЛО
    document.getElementById('trainerResetStartBtn').onclick = function() {
        if (trainerSentences.length > 0) {
            trainerIndex = 0;
            showTrainerSentence(container);
        }
    };
}

// ===== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ =====
function updateTrainerDisplay(container) {
    const result = document.getElementById('trainerResult');
    const wordsContainer = document.getElementById('trainerWordsContainer');
    
    if (result) {
        const hasWords = trainerSelectedWords.length > 0;
        const displayText = trainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.fontWeight = hasWords ? 'bold' : 'normal';
        result.style.backgroundColor = '#FFFFFF';
    }
    
    if (wordsContainer) {
        wordsContainer.innerHTML = '';
        trainerAvailableWords.forEach(word => {
            const isActive = trainerActiveWords[word.display];
            const btn = document.createElement('button');
            btn.className = 'word-btn';
            btn.textContent = word.display;
            btn.style.cssText = isActive 
                ? 'padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 40px; cursor: pointer;'
                : 'padding: 12px 8px; font-size: 14px; text-align: center; min-height: 48px; display: flex; align-items: center; justify-content: center; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 40px; cursor: default; opacity: 0.4; pointer-events: none;';
            if (isActive) {
                btn.onclick = function() {
                    if (trainerActiveWords[word.display]) {
                        trainerActiveWords[word.display] = false;
                        const foundWord = trainerAvailableWords.find(w => w.display === word.display);
                        if (foundWord) {
                            trainerSelectedWords.push(foundWord);
                            updateTrainerDisplay(container);
                        }
                    }
                };
            }
            wordsContainer.appendChild(btn);
        });
    }
}
