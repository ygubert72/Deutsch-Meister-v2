// ====================================================================
// quizMode.js — Тренировка (выбор перевода) с ContainerManager
// ====================================================================

let quizWords = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizDirection = 'de_to_ru';
let quizStudiedWords = {};
let currentLessonId = null;

function renderQuiz(container, lesson) {
    const vocab = lesson.vocabulary || [];
    if (vocab.length === 0) {
        container.innerHTML = '<div>Нет слов для тренировки.</div>';
        return;
    }

    currentLessonId = lesson.id || 1;

    // Загружаем сохранённые изученные слова
    try {
        const saved = localStorage.getItem('dm_quiz_studied_' + currentLessonId);
        if (saved) {
            quizStudiedWords = JSON.parse(saved);
        } else {
            quizStudiedWords = {};
        }
    } catch(e) {
        quizStudiedWords = {};
    }

    quizWords = vocab.filter(word => !quizStudiedWords[word.de]);
    if (quizWords.length === 0) {
        quizWords = [...vocab];
        quizStudiedWords = {};
        localStorage.removeItem('dm_quiz_studied_' + currentLessonId);
    }
    
    quizIndex = 0;
    quizDirection = 'de_to_ru';

    let html = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn" style="background: #3B6FE0; color: white; padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
                ${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
            </button>
            <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 550px; margin: 15px auto; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                <div style="font-size: 32px; font-weight: bold; color: #1A1A1A;" id="quizQuestion">Загрузка...</div>
            </div>
            <div class="quiz-grid" id="quizGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 700px; margin: 20px auto;"></div>
            <div style="font-size: 14px; color: #888; margin-top: 10px;" id="quizProgress">0 / 0</div>
            <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 10px 0;">
                <button class="ctrl-btn" id="quizStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="quizContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="quizPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                <button class="ctrl-btn" id="quizNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="quizResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('quizDirBtn').onclick = function() {
        quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        this.textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        showQuizQuestion();
    };

    document.getElementById('quizStudyBtn').onclick = function() {
        if (quizCurrentWord) {
            quizStudiedWords[quizCurrentWord.de] = true;
            saveQuizState();
            quizWords = quizWords.filter(w => w.de !== quizCurrentWord.de);
            if (quizWords.length === 0) {
                document.getElementById('quizQuestion').textContent = '🎉 Все слова изучены!';
                document.getElementById('quizGrid').innerHTML = '';
                document.getElementById('quizProgress').textContent = '0 / 0';
                return;
            }
            if (quizIndex >= quizWords.length) quizIndex = 0;
            showQuizQuestion();
        }
    };

    // ===== КОНТЕЙНЕР ЧЕРЕЗ ContainerManager =====
    document.getElementById('quizContainerBtn').onclick = function() {
        const studied = getStudiedWordsList();
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showQuizContainer(studied);
    };

    document.getElementById('quizPrevBtn').onclick = function() {
        if (quizWords.length > 0 && quizIndex > 0) {
            quizIndex--;
            showQuizQuestion();
        }
    };

    document.getElementById('quizNextBtn').onclick = function() {
        if (quizWords.length > 0) {
            quizIndex = (quizIndex + 1) % quizWords.length;
            showQuizQuestion();
        }
    };

    document.getElementById('quizResetStartBtn').onclick = function() {
        if (quizWords.length > 0) {
            quizIndex = 0;
            showQuizQuestion();
        }
    };

    showQuizQuestion();
}

function saveQuizState() {
    try {
        localStorage.setItem('dm_quiz_studied_' + currentLessonId, JSON.stringify(quizStudiedWords));
    } catch(e) {}
}

function getStudiedWordsList() {
    const vocab = window.currentLesson?.vocabulary || [];
    return vocab.filter(word => quizStudiedWords[word.de]);
}

// ===== ИСПОЛЬЗУЕМ ContainerManager ДЛЯ КОНТЕЙНЕРА =====
function showQuizContainer(studiedWords) {
    if (typeof ContainerManager === 'undefined') {
        alert('ContainerManager не загружен. Проверьте подключение скриптов.');
        return;
    }

    ContainerManager.show({
        title: `📦 КОНТЕЙНЕР (${studiedWords.length} слов)`,
        items: studiedWords,
        getItems: getStudiedWordsList,
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: function(word) {
            return `${word.de} — ${word.ru}`;
        },
        onItemClick: function(word, idx, update) {
            // Возвращаем слово из контейнера
            delete quizStudiedWords[word.de];
            saveQuizState();
            
            // Обновляем список невыученных слов
            const vocab = window.currentLesson?.vocabulary || [];
            quizWords = vocab.filter(w => !quizStudiedWords[w.de]);
            if (quizWords.length > 0 && quizIndex >= quizWords.length) {
                quizIndex = 0;
            }
            
            // Обновляем контейнер
            update();
            
            // Если контейнер стал пустым — обновляем основной экран
            if (getStudiedWordsList().length === 0) {
                if (quizWords.length > 0) {
                    showQuizQuestion();
                }
            }
        },
        onReturnAll: function(update) {
            // Возвращаем все слова
            const vocab = window.currentLesson?.vocabulary || [];
            vocab.forEach(word => { delete quizStudiedWords[word.de]; });
            saveQuizState();
            quizWords = [...vocab];
            quizIndex = 0;
            update();
            showQuizQuestion();
        }
    });
}

function showQuizQuestion() {
    if (quizWords.length === 0) {
        document.getElementById('quizQuestion').textContent = '🎉 Все слова изучены!';
        document.getElementById('quizGrid').innerHTML = '';
        document.getElementById('quizProgress').textContent = '0 / 0';
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
                    quizIndex = (quizIndex + 1) % quizWords.length;
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
}
