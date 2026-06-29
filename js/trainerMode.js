// ====================================================================
// trainerMode.js — Тренажёр (сборка фраз из слов)
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

function renderTrainer(container, lesson) {
    trainerCurrentLessonData = lesson;
    const lessonId = lesson.id || 1;
    trainerCurrentLessonId = lessonId;
    
    loadTrainerState(lessonId);
    
    // Берем фразы из загруженного урока
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
    
    // Берем все слова из vocabulary для подсказок
    allVocabWords = lesson.vocabulary || [];
    
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
    
    const availableTemplates = templates.filter(t => {
        const key = t.de + '|' + t.ru;
        return !trainerStudiedSentences[key];
    });
    
    let finalTemplates = availableTemplates;
    if (finalTemplates.length === 0) {
        finalTemplates = [...templates];
        trainerStudiedSentences = {};
        localStorage.removeItem('dm_trainer_studied_' + lessonId);
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
    const lesson = trainerCurrentLessonData || window.currentLesson;
    if (!lesson) return [];
    const templates = lesson.trainer || [];
    return templates.filter(sentence => {
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
    console.log('📦 showTrainerContainer вызван');
    
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
        console.log('📦 Рендеринг контейнера, фраз:', studied.length);
        
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
                    console.log('🔄 Возвращаем фразу:', key);
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
        console.log('✅ Модалка добавлена в DOM');

        const returnAllBtn = document.getElementById('returnAllBtn');
        if (returnAllBtn) {
            returnAllBtn.addEventListener('click', function() {
                if (!confirm('Вернуть все фразы из контейнера?')) return;
                console.log('🔄 Возвращаем все фразы');
                const lesson = trainerCurrentLessonData || window.currentLesson;
                if (lesson) {
                    const templates = lesson.trainer || [];
                    templates.forEach(t => {
                        const key = t.de + '|' + t.ru;
                        delete trainerStudiedSentences[key];
                    });
                }
                saveTrainerState();
                const lesson2 = trainerCurrentLessonData || window.currentLesson;
                if (lesson2) {
                    trainerSentences = [...lesson2.trainer];
                }
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

    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="trainerDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru'}
            </button>
        `;
        document.getElementById('trainerDirBtn').addEventListener('click', function() {
            trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
            this.textContent = trainerDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru';
            showTrainerSentence(container);
        });
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

    document.querySelectorAll('#trainerWordsContainer .word-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const word = this.getAttribute('data-word');
            if (trainerActiveWords[word]) {
                trainerActiveWords[word] = false;
                const foundWord = trainerAvailableWords.find(w => w.display === word);
                if (foundWord) {
                    trainerSelectedWords.push(foundWord);
                    updateTrainerDisplay(container);
                }
            }
        });
    });

    document.getElementById('trainerUndoBtn').addEventListener('click', function() {
        if (trainerSelectedWords.length > 0) {
            const lastWord = trainerSelectedWords.pop();
            trainerActiveWords[lastWord.display] = true;
            updateTrainerDisplay(container);
        }
    });

    document.getElementById('trainerResetBtn').addEventListener('click', function() {
        trainerSelectedWords = [];
        trainerAvailableWords.forEach(w => { trainerActiveWords[w.display] = true; });
        updateTrainerDisplay(container);
        document.getElementById('trainerHintLabel').textContent = '';
        trainerHintIndex = 0;
    });

    document.getElementById('trainerCheckBtn').addEventListener('click', function() {
        if (trainerSelectedWords.length === 0) {
            const result = document.getElementById('trainerResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }

        const userAnswer = trainerSelectedWords.map(w => w.display).join(' ');
        const result = document.getElementById('trainerResult');
        const correctAnswerForCheck = isRuToDe ? trainerCurrentSentence.de : trainerCurrentSentence.ru;

        const normalizedUser = userAnswer.replace(/[.,!?;:]/g, '').trim().toLowerCase();
        const normalizedCorrect = correctAnswerForCheck.replace(/[.,!?;:]/g, '').trim().toLowerCase();

        if (normalizedUser === normalizedCorrect) {
            result.style.backgroundColor = '#C8E6C9';
            result.textContent = '✅ ПРАВИЛЬНО!';
            
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                trainerIndex++;
                showTrainerSentence(container);
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            result.textContent = '❌ НЕПРАВИЛЬНО. Попробуйте снова!';
            
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                trainerSelectedWords.forEach(w => { trainerActiveWords[w.display] = true; });
                trainerSelectedWords = [];
                updateTrainerDisplay(container);
                const hasWords = trainerSelectedWords.length > 0;
                const displayText = trainerSelectedWords.map(w => w.display).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
                result.textContent = displayText;
                result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
                result.style.fontWeight = hasWords ? 'bold' : 'normal';
            }, 800);
        }
    });

    document.getElementById('trainerSpeakBtn').addEventListener('click', function() {
        speak(trainerCurrentSentence.de);
    });

    document.getElementById('trainerHintBtn').addEventListener('click', function() {
        const hintLabel = document.getElementById('trainerHintLabel');
        if (trainerHintIndex < trainerHintWords.length) {
            const currentHint = trainerHintWords.slice(0, trainerHintIndex + 1).join(' ');
            hintLabel.textContent = '💡 ' + currentHint;
            trainerHintIndex++;
        } else {
            hintLabel.textContent = '💡 Полное предложение: ' + trainerHintWords.join(' ');
        }
    });

    document.getElementById('trainerStudyBtn').addEventListener('click', function() {
        if (trainerCurrentSentence) {
            const key = trainerCurrentSentence.de + '|' + trainerCurrentSentence.ru;
            trainerStudiedSentences[key] = true;
            saveTrainerState();
            
            trainerSentences = trainerSentences.filter(t => {
                const k = t.de + '|' + t.ru;
                return k !== key;
            });
            
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
            showTrainerSentence(container);
        }
    });

    const containerBtn = document.getElementById('trainerContainerBtn');
    if (containerBtn) {
        containerBtn.onclick = null;
        containerBtn.removeEventListener('click', containerBtn._handler);
        
        containerBtn._handler = function() {
            console.log('📦 Кнопка "В КОНТЕЙНЕР" нажата (Тренажер)');
            const studied = getStudiedSentencesList();
            console.log('📦 Изученных фраз:', studied?.length);
            
            if (!studied || studied.length === 0) {
                alert('📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.');
                return;
            }
            
            if (typeof showTrainerContainer === 'function') {
                showTrainerContainer();
            } else {
                console.error('❌ showTrainerContainer не найдена!');
                alert('Ошибка: функция контейнера не найдена');
            }
        };
        
        containerBtn.addEventListener('click', containerBtn._handler);
        console.log('✅ Кнопка "В КОНТЕЙНЕР" (Тренажер) перепривязана!');
    }

    document.getElementById('trainerPrevBtn').addEventListener('click', function() {
        if (trainerIndex > 0) {
            trainerIndex--;
            showTrainerSentence(container);
        }
    });

    document.getElementById('trainerNextBtn').addEventListener('click', function() {
        if (trainerIndex + 1 < trainerSentences.length) {
            trainerIndex++;
            showTrainerSentence(container);
        }
    });

    document.getElementById('trainerResetStartBtn').addEventListener('click', function() {
        if (trainerSentences.length > 0) {
            trainerIndex = 0;
            showTrainerSentence(container);
        }
    });
}

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
                btn.addEventListener('click', function() {
                    if (trainerActiveWords[word.display]) {
                        trainerActiveWords[word.display] = false;
                        const foundWord = trainerAvailableWords.find(w => w.display === word.display);
                        if (foundWord) {
                            trainerSelectedWords.push(foundWord);
                            updateTrainerDisplay(container);
                        }
                    }
                });
            }
            wordsContainer.appendChild(btn);
        });
    }
}
