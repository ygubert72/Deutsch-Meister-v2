// ====================================================================
// app.js — ПОЛНАЯ ВЕРСИЯ
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let courseData = null;

// ========== ОЗВУЧКА ==========
function speak(text) {
    if (!text || !window.speechSynthesis) return;
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch(e) {
        console.log('Ошибка озвучки:', e);
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadLevel(level) {
    currentLevel = level;
    try {
        const response = await fetch(`docs/course/${level}/index.json`);
        if (!response.ok) throw new Error('Курс не найден');
        courseData = await response.json();
        renderLevel();
    } catch(e) {
        console.error('Ошибка загрузки курса:', e);
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
                <div>Курс для уровня ${level} пока не загружен.</div>
                <div style="font-size: 14px; margin-top: 10px;">${e.message}</div>
            </div>
        `;
    }
}

async function loadLesson(lessonId) {
    try {
        const lessonInfo = courseData.lessons.find(l => l.id === lessonId);
        if (!lessonInfo) throw new Error('Урок не найден');
        
        const response = await fetch(`docs/course/${currentLevel}/lessons/${lessonInfo.file}`);
        if (!response.ok) throw new Error('Файл урока не найден');
        const lesson = await response.json();
        renderLesson(lesson);
    } catch(e) {
        console.error('Ошибка загрузки урока:', e);
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <div>Ошибка загрузки урока.</div>
                <div style="font-size: 14px; margin-top: 10px;">${e.message}</div>
                <button class="back-btn" onclick="renderLevel()" style="margin-top: 15px;">← Назад</button>
            </div>
        `;
    }
}

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА ==========
function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    
    if (currentLesson) {
        const vocabCount = currentLesson.vocabulary ? currentLesson.vocabulary.length : 0;
        const practiceCount = currentLesson.practice ? currentLesson.practice.length : 0;
        el.textContent = `Слов: ${vocabCount} | Упражнений: ${practiceCount}`;
    } else if (courseData) {
        el.textContent = `Уровень ${currentLevel} | Уроков: ${courseData.lessons.length}`;
    } else {
        el.textContent = 'Загрузка...';
    }
}

// ========== ОТОБРАЖЕНИЕ УРОВНЕЙ ==========
function renderLevel() {
    if (!courseData) {
        loadLevel(currentLevel);
        return;
    }

    let html = `<h2>📚 ${courseData.title}</h2><div style="margin-top: 20px;">`;
    courseData.lessons.forEach(lesson => {
        html += `
            <button class="lesson-btn" data-lesson-id="${lesson.id}">
                📘 Урок ${lesson.id}: ${lesson.title}
            </button>
        `;
    });
    html += `</div>`;
    document.getElementById('content').innerHTML = html;
    document.getElementById('modeIndicator').textContent = `Курс ${currentLevel}`;
    updateCounter();

    document.querySelectorAll('.lesson-btn').forEach(btn => {
        btn.onclick = function() {
            const id = parseInt(this.getAttribute('data-lesson-id'));
            loadLesson(id);
        };
    });
}

// ========== ОТОБРАЖЕНИЕ УРОКА ==========
function renderLesson(lesson) {
    currentLesson = lesson;

    let html = `
        <button class="back-btn" onclick="renderLevel()">← К СПИСКУ УРОКОВ</button>
        <h2>📖 Урок ${lesson.id}: ${lesson.title}</h2>
        <div class="mode-buttons">
            <button class="mode-btn active" data-mode="grammar">📘 Грамматика</button>
            <button class="mode-btn" data-mode="vocabulary">📚 Лексика</button>
            <button class="mode-btn" data-mode="practice">✍️ Практика</button>
            <button class="mode-btn" data-mode="quiz">🎯 Тренировка</button>
            <button class="mode-btn" data-mode="trainer">🏋️ Тренажёр</button>
            <button class="mode-btn" data-mode="dictation">✏️ Диктант</button>
        </div>
        <div id="modeContent"></div>
    `;
    document.getElementById('content').innerHTML = html;
    document.getElementById('modeIndicator').textContent = `Урок ${lesson.id}: ${lesson.title}`;
    updateCounter();

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderMode(this.getAttribute('data-mode'), lesson);
        };
    });

    renderMode('grammar', lesson);
}

// ========== ОТОБРАЖЕНИЕ РЕЖИМОВ ==========
function renderMode(mode, lesson) {
    const container = document.getElementById('modeContent');
    if (!container) return;

    window.currentLesson = lesson;

    switch(mode) {
        case 'grammar':
            renderGrammar(container, lesson);
            break;
        case 'vocabulary':
            renderVocabulary(container, lesson);
            break;
        case 'practice':
            renderPractice(container, lesson);
            break;
        case 'quiz':
            renderQuiz(container, lesson);
            break;
        case 'trainer':
            renderTrainer(container, lesson);
            break;
        case 'dictation':
            renderDictation(container, lesson);
            break;
        default:
            container.innerHTML = '<div>Режим не найден</div>';
    }
}

// ========== ГРАММАТИКА ==========
function renderGrammar(container, lesson) {
    let html = `<div style="line-height: 1.8;">${lesson.grammar || ''}</div>`;
    
    if (lesson.examples && lesson.examples.length) {
        html += `<h4>📝 Примеры:</h4><div style="margin-top: 10px;">`;
        lesson.examples.forEach(ex => {
            const safeText = ex.de.replace(/'/g, "\\'");
            html += `
                <div style="background: #E8F0FE; padding: 10px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${ex.de}</strong> — ${ex.ru}</span>
                    <button class="speak-btn" onclick="speak('${safeText}')">🔊</button>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

// ========== ЛЕКСИКА ==========
function renderVocabulary(container, lesson) {
    const vocab = lesson.vocabulary || [];
    if (vocab.length === 0) {
        container.innerHTML = '<div>Слова не загружены</div>';
        return;
    }

    let html = '<div class="vocab-grid">';
    vocab.forEach(word => {
        const safeText = word.de.replace(/'/g, "\\'");
        html += `
            <div class="vocab-item">
                <span><strong>${word.de}</strong> — ${word.ru}</span>
                <button class="speak-btn" onclick="speak('${safeText}')">🔊</button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ========== ПРАКТИКА ==========
function renderPractice(container, lesson) {
    const exercises = lesson.practice || [];
    if (exercises.length === 0) {
        container.innerHTML = '<div>Упражнений нет</div>';
        return;
    }

    let html = '<h3>✍️ Упражнения</h3>';
    exercises.forEach((ex, index) => {
        html += `
            <div class="practice-item" id="practice-item-${index}">
                <div><strong>${index + 1}.</strong> ${ex.question}</div>
                <div style="margin: 8px 0;">${ex.sentence}</div>
                <input type="text" class="practice-input" data-index="${index}" placeholder="Введите ответ..." autocomplete="off">
                <button class="check-btn" data-index="${index}">ПРОВЕРИТЬ</button>
                <div class="practice-result" data-index="${index}"></div>
            </div>
        `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.check-btn').forEach(btn => {
        btn.onclick = function() {
            const index = parseInt(this.getAttribute('data-index'));
            const input = container.querySelector(`.practice-input[data-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-index="${index}"]`);
            const exercise = exercises[index];

            if (!input || !result) return;
            const userAnswer = input.value.trim().toLowerCase();
            const correctAnswer = exercise.answer.toLowerCase();

            if (userAnswer === correctAnswer) {
                result.innerHTML = '✅ Правильно!';
                result.className = 'practice-result result-correct';
                input.style.borderColor = '#4CAF50';
                input.style.backgroundColor = '#E8F5E9';
                input.disabled = true;
            } else {
                result.innerHTML = '❌ Неправильно. Попробуйте ещё раз!';
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
                input.style.backgroundColor = '#FFEBEE';
                setTimeout(() => {
                    input.value = '';
                    input.style.borderColor = '#D0D0D0';
                    input.style.backgroundColor = '';
                    result.innerHTML = '';
                    input.focus();
                }, 500);
            }
        };
    });
}

// ========== ТРЕНИРОВКА (ВИКТОРИНА/ТЕСТ) ==========
let quizWords = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizDirection = 'de_to_ru';

function renderQuiz(container, lesson) {
    const vocab = lesson.vocabulary || [];
    if (vocab.length === 0) {
        container.innerHTML = '<div>Нет слов для тренировки.</div>';
        return;
    }

    quizWords = [...vocab];
    quizIndex = 0;
    quizDirection = 'de_to_ru';

    let html = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn" style="background: #3B6FE0; color: white; padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
                ${quizDirection === 'de_to_ru' ? '🇩🇪→🇷🇺' : '🇷🇺→🇩🇪'}
            </button>
            <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 550px; margin: 15px auto; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                <div style="font-size: 32px; font-weight: bold; color: #1A1A1A;" id="quizQuestion">Загрузка...</div>
            </div>
            <div class="quiz-grid" id="quizGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 700px; margin: 20px auto;"></div>
            <div style="font-size: 14px; color: #888; margin-top: 10px;" id="quizProgress">0 / 0</div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 15px;">
                <button class="ctrl-btn" id="quizResetBtn">🔄 НАЧАТЬ ЗАНОВО</button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('quizDirBtn').onclick = function() {
        quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        this.textContent = quizDirection === 'de_to_ru' ? '🇩🇪→🇷🇺' : '🇷🇺→🇩🇪';
        quizIndex = 0;
        showQuizQuestion();
    };

    document.getElementById('quizResetBtn').onclick = function() {
        quizIndex = 0;
        showQuizQuestion();
    };

    showQuizQuestion();
}

function showQuizQuestion() {
    if (quizWords.length === 0) {
        document.getElementById('quizQuestion').textContent = '🎉 Нет слов для тренировки!';
        document.getElementById('quizGrid').innerHTML = '';
        document.getElementById('quizProgress').textContent = '0 / 0';
        return;
    }

    if (quizIndex >= quizWords.length) {
        document.getElementById('quizQuestion').textContent = '🎉 Поздравляем! Вы прошли все слова!';
        document.getElementById('quizGrid').innerHTML = `
            <div style="grid-column: span 2; text-align: center; padding: 20px; color: #4CAF50; font-weight: bold; font-size: 18px;">
                ✅ Отлично! Нажмите "Начать заново", чтобы повторить.
            </div>
        `;
        document.getElementById('quizProgress').textContent = `${quizWords.length} / ${quizWords.length}`;
        return;
    }

    quizCurrentWord = quizWords[quizIndex];
    const isDeToRu = quizDirection === 'de_to_ru';
    const question = isDeToRu ? quizCurrentWord.de : quizCurrentWord.ru;
    const correctAnswer = isDeToRu ? quizCurrentWord.ru : quizCurrentWord.de;

    document.getElementById('quizQuestion').textContent = question;
    document.getElementById('quizProgress').textContent = `${quizIndex + 1} / ${quizWords.length}`;

    const allWords = [...quizWords];
    const otherWords = allWords.filter(w => w !== quizCurrentWord);
    const shuffled = [...otherWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const options = [quizCurrentWord, ...shuffled.slice(0, 5)];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    const grid = document.getElementById('quizGrid');
    grid.innerHTML = '';
    options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.textContent = isDeToRu ? opt.ru : opt.de;
        btn.style.cssText = 'padding: 16px; background: #FFFFFF; border: 2px solid #D0D0D0; border-radius: 16px; cursor: pointer; font-size: 16px; transition: all 0.05s linear; text-align: center; box-shadow: 0 3px 4px rgba(0,0,0,0.1);';
        btn.onclick = function() {
            const isCorrect = isDeToRu ? (opt.ru === correctAnswer) : (opt.de === correctAnswer);
            if (isCorrect) {
                this.style.background = '#C8E6C9';
                this.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    quizIndex++;
                    showQuizQuestion();
                }, 400);
            } else {
                this.style.background = '#FFCDD2';
                this.style.borderColor = '#F44336';
                setTimeout(() => {
                    this.style.background = '#FFFFFF';
                    this.style.borderColor = '#D0D0D0';
                }, 500);
            }
        };
        grid.appendChild(btn);
    });

    speak(question);
}

// ========== ТРЕНАЖЁР ==========
let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerActiveWords = {};
let trainerHintIndex = 0;
let trainerHintWords = [];

function renderTrainer(container, lesson) {
    const vocab = lesson.vocabulary || [];
    if (vocab.length < 5) {
        container.innerHTML = '<div>Недостаточно слов для тренажёра. Нужно минимум 5 слов.</div>';
        return;
    }

    trainerSentences = [];
    for (let i = 0; i < Math.min(vocab.length, 20); i += 3) {
        if (i + 2 < vocab.length) {
            const words = [vocab[i], vocab[i+1], vocab[i+2]];
            const shuffled = [...words];
            for (let j = shuffled.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
            }
            trainerSentences.push({
                original: words,
                shuffled: shuffled
            });
        }
    }

    if (trainerSentences.length === 0) {
        container.innerHTML = '<div>Не удалось создать предложения для тренажёра.</div>';
        return;
    }

    trainerIndex = 0;
    showTrainerSentence(container);
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
    trainerSelectedWords = [];
    trainerAvailableWords = [...trainerCurrentSentence.shuffled];
    trainerActiveWords = {};
    trainerAvailableWords.forEach(w => { trainerActiveWords[w.de] = true; });
    trainerHintIndex = 0;
    trainerHintWords = trainerCurrentSentence.original.map(w => w.de);

    let html = `
        <div style="text-align: center;">
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Составьте предложение:</div>
                <div style="font-size: 18px; font-weight: bold;">${trainerCurrentSentence.original.map(w => w.ru).join(' ')}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-weight: bold; font-size: 18px; min-height: 60px;" id="trainerResult">
                ${trainerSelectedWords.join(' ') || 'Нажмите на слова, чтобы собрать предложение'}
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

    container.querySelectorAll('#trainerWordsContainer .word-btn').forEach(btn => {
        btn.onclick = function() {
            const word = this.getAttribute('data-word');
            if (trainerActiveWords[word]) {
                trainerActiveWords[word] = false;
                trainerSelectedWords.push(word);
                updateTrainerDisplay(container);
            }
        };
    });

    document.getElementById('trainerUndoBtn').onclick = function() {
        if (trainerSelectedWords.length > 0) {
            const lastWord = trainerSelectedWords.pop();
            trainerActiveWords[lastWord] = true;
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

        const correctAnswer = trainerCurrentSentence.original.map(w => w.de).join(' ');
        const userAnswer = trainerSelectedWords.join(' ');
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
            trainerSelectedWords.forEach(w => { trainerActiveWords[w] = true; });
            trainerSelectedWords = [];
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                updateTrainerDisplay(container);
            }, 500);
        }
    };

    document.getElementById('trainerSpeakBtn').onclick = function() {
        const text = trainerCurrentSentence.original.map(w => w.de).join(' ');
        speak(text);
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
        result.textContent = trainerSelectedWords.join(' ') || 'Нажмите на слова, чтобы собрать предложение';
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
                        trainerSelectedWords.push(word.de);
                        updateTrainerDisplay(container);
                    }
                };
                wordsContainer.appendChild(btn);
            }
        });
    }
}

// ========== ДИКТАНТ ==========
function renderDictation(container, lesson) {
    const sentences = lesson.dictation || [];
    if (sentences.length === 0) {
        container.innerHTML = '<div>Нет предложений для диктанта</div>';
        return;
    }

    let html = '<h3>✏️ Правописание</h3><p>Напишите перевод на немецком языке:</p>';
    sentences.forEach((s, index) => {
        html += `
            <div class="dictation-item" id="dictation-item-${index}">
                <div><strong>${index + 1}.</strong> ${s.ru}</div>
                <input type="text" class="practice-input" data-dict-index="${index}" placeholder="Введите перевод..." autocomplete="off">
                <button class="check-btn" data-dict-index="${index}">ПРОВЕРИТЬ</button>
                <div class="practice-result" data-dict-index="${index}"></div>
            </div>
        `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.check-btn[data-dict-index]').forEach(btn => {
        btn.onclick = function() {
            const index = parseInt(this.getAttribute('data-dict-index'));
            const input = container.querySelector(`.practice-input[data-dict-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-dict-index="${index}"]`);
            const sentence = sentences[index];

            if (!input || !result) return;
            const userAnswer = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
            const correctAnswer = sentence.de.toLowerCase().replace(/\s+/g, ' ');

            if (userAnswer === correctAnswer) {
                result.innerHTML = '✅ Правильно!';
                result.className = 'practice-result result-correct';
                input.style.borderColor = '#4CAF50';
                input.style.backgroundColor = '#E8F5E9';
                input.disabled = true;
            } else {
                result.innerHTML = '❌ Неправильно. Попробуйте ещё раз!';
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
                input.style.backgroundColor = '#FFEBEE';
                setTimeout(() => {
                    input.value = '';
                    input.style.borderColor = '#D0D0D0';
                    input.style.backgroundColor = '';
                    result.innerHTML = '';
                    input.focus();
                }, 500);
            }
        };
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initApp() {
    console.log('🚀 Запуск Deutsch-Meister...');
    
    document.querySelectorAll('#levelsContainer .btn-level').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentLevel = this.getAttribute('data-level');
            loadLevel(currentLevel);
        };
    });
    
    document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentLevel = this.getAttribute('data-level');
            loadLevel(currentLevel);
        };
    });
    
    loadLevel('A1');
    console.log('✅ Deutsch-Meister готов!');
}

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
