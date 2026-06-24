// ====================================================================
// trainerMode.js — Тренажёр (шаблоны из файла урока)
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

function renderTrainer(container, lesson) {
    const lessonId = lesson.id || 1;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 15px;">⏳</div>
            <div>Загрузка слов для тренажёра...</div>
        </div>
    `;
    
    // Берём шаблоны из самого урока
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
    
    // Загружаем слова из всех пройденных уроков
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
        
        // Создаём карту слов
        const wordMap = {};
        allVocabWords.forEach(w => {
            const key = w.de.toLowerCase().replace(/[.,!?;:]/g, '');
            wordMap[key] = w;
        });
        
        // Фильтруем шаблоны
        const availableTemplates = templates.filter(template => {
            const words = template.de.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
            return words.every(w => {
                const cleanW = w.replace(/[.,!?;:]/g, '');
                return wordMap[cleanW] !== undefined;
            });
        });
        
        if (availableTemplates.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                    <div>Недостаточно подходящих слов для осмысленных предложений.</div>
                    <div style="font-size: 14px; margin-top: 10px;">Попробуйте другой урок.</div>
                </div>
            `;
            return;
        }
        
        // Перемешиваем и берём до 20 предложений
        const shuffled = [...availableTemplates];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const maxSentences = Math.min(shuffled.length, 20);
        trainerSentences = shuffled.slice(0, maxSentences);
        
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
    
    const deWords = trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = trainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);

    const words = deWords.map((w, i) => ({
        de: w,
        ru: ruWords[i] || w,
        originalIndex: i
    }));

    const shuffledWords = [...words];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
    }

    trainerSelectedWords = [];
    trainerAvailableWords = shuffledWords;
    trainerActiveWords = {};
    trainerAvailableWords.forEach(w => { trainerActiveWords[w.de] = true; });
    trainerHintIndex = 0;
    trainerHintWords = deWords;

    const isRuToDe = trainerDirection === 'ru_to_de';
    const questionText = isRuToDe ? trainerCurrentSentence.ru : trainerCurrentSentence.de;

    const hasWords = trainerSelectedWords.length > 0;
    const displayText = trainerSelectedWords.map(w => w.de).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
    const textColor = hasWords ? '#1A1A1A' : '#CCCCCC';
    const fontWeight = hasWords ? 'bold' : 'normal';

    let html = `
        <div style="text-align: center;">
            <button class="dir-btn" id="trainerDirBtn" style="background: #3B6FE0; color: white; padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
                ${isRuToDe ? '🇷🇺→🇩🇪' : '🇩🇪→🇷🇺'}
            </button>
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Составьте предложение на немецком:</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-size: 20px; min-height: 60px; color: ${textColor}; font-weight: ${fontWeight};" id="trainerResult">
                ${displayText}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 15px 0;" id="trainerWordsContainer">
                ${trainerAvailableWords.map(word => `
                    <button class="word-btn" data-word="${word.de}">
                        ${word.de}
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
                <button class="ctrl-btn" id="trainerPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="trainerNextBtn">ВПЕРЕД ▶</button>
                <div style="font-size: 14px; color: #888; display: flex; align-items: center;">${trainerIndex + 1} / ${trainerSentences.length}</div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('trainerDirBtn').onclick = function() {
        trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
        this.textContent = trainerDirection === 'ru_to_de' ? '🇷🇺→🇩🇪' : '🇩🇪→🇷🇺';
        showTrainerSentence(container);
    };

    container.querySelectorAll('#trainerWordsContainer .word-btn').forEach(btn => {
        btn.onclick = function() {
            const word = this.getAttribute('data-word');
            if (trainerActiveWords[word]) {
                trainerActiveWords[word] = false;
                const foundWord = trainerAvailableWords.find(w => w.de === word);
                if (foundWord) {
                    trainerSelectedWords.push(foundWord);
                    updateTrainerDisplay(container);
                }
            }
        };
    });

    document.getElementById('trainerUndoBtn').onclick = function() {
        if (trainerSelectedWords.length > 0) {
            const lastWord = trainerSelectedWords.pop();
            trainerActiveWords[lastWord.de] = true;
            updateTrainerDisplay(container);
        }
    };

    document.getElementById('trainerResetBtn').onclick = function() {
        trainerSelectedWords = [];
        trainerAvailableWords.forEach(w => { trainerActiveWords[w.de] = true; });
        updateTrainerDisplay(container);
        document.getElementById('trainerHintLabel').textContent = '';
        trainerHintIndex = 0;
    };

    document.getElementById('trainerCheckBtn').onclick = function() {
        if (trainerSelectedWords.length === 0) {
            const result = document.getElementById('trainerResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }

        const correctAnswer = trainerCurrentSentence.de;
        const userAnswer = trainerSelectedWords.map(w => w.de).join(' ');
        const result = document.getElementById('trainerResult');

        if (userAnswer === correctAnswer) {
            result.style.backgroundColor = '#C8E6C9';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                trainerIndex++;
                showTrainerSentence(container);
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            trainerSelectedWords.forEach(w => { trainerActiveWords[w.de] = true; });
            trainerSelectedWords = [];
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                updateTrainerDisplay(container);
            }, 500);
        }
    };

    document.getElementById('trainerSpeakBtn').onclick = function() {
        speak(trainerCurrentSentence.de);
    };

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

    document.getElementById('trainerPrevBtn').onclick = function() {
        if (trainerIndex > 0) {
            trainerIndex--;
            showTrainerSentence(container);
        }
    };

    document.getElementById('trainerNextBtn').onclick = function() {
        if (trainerIndex + 1 < trainerSentences.length) {
            trainerIndex++;
            showTrainerSentence(container);
        }
    };
}

function updateTrainerDisplay(container) {
    const result = document.getElementById('trainerResult');
    const wordsContainer = document.getElementById('trainerWordsContainer');
    
    if (result) {
        const hasWords = trainerSelectedWords.length > 0;
        const displayText = trainerSelectedWords.map(w => w.de).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.textContent = displayText;
        result.style.color = hasWords ? '#1A1A1A' : '#CCCCCC';
        result.style.fontWeight = hasWords ? 'bold' : 'normal';
        result.style.backgroundColor = '#FFFFFF';
    }
    
    if (wordsContainer) {
        wordsContainer.innerHTML = '';
        trainerAvailableWords.forEach(word => {
            if (trainerActiveWords[word.de]) {
                const btn = document.createElement('button');
                btn.className = 'word-btn';
                btn.textContent = word.de;
                btn.onclick = function() {
                    if (trainerActiveWords[word.de]) {
                        trainerActiveWords[word.de] = false;
                        const foundWord = trainerAvailableWords.find(w => w.de === word.de);
                        if (foundWord) {
                            trainerSelectedWords.push(foundWord);
                            updateTrainerDisplay(container);
                        }
                    }
                };
                wordsContainer.appendChild(btn);
            }
        });
    }
}
