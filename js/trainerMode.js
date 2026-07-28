function showTrainerSentence(container) {
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
    const correctOnButtons = trainerAvailableWords.filter(w => w.isCorrect).length;
    if (correctOnButtons < 3 && _trainerWordQueue.length > 0) {
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
        }
    }

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
