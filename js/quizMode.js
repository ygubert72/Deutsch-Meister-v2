// ====================================================================
// quizMode.js — Тренировка (выбор перевода из 6 вариантов)
// ====================================================================

let quizWords = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizDirection = 'de_to_ru';
let quizStudiedWords = {};
let currentLessonId = null;
let currentLessonData = null;

function renderQuiz(container, lesson) {
    // СОХРАНЯЕМ ДАННЫЕ УРОКА
    currentLessonData = lesson;
    currentLessonId = lesson.id || 1;
    
    console.log('📚 renderQuiz: урок загружен, слов:', lesson.vocabulary?.length);
    
    const vocab = lesson.vocabulary || [];
    if (vocab.length === 0) {
        container.innerHTML = '<div>Нет слов для тренировки.</div>';
        return;
    }

    try {
        const saved = localStorage.getItem('dm_quiz_studied_' + currentLessonId);
        if (saved) {
            quizStudiedWords = JSON.parse(saved);
            console.log('📂 Загружено изученных слов:', Object.keys(quizStudiedWords).length);
        } else {
            quizStudiedWords = {};
        }
    } catch(e) {
        quizStudiedWords = {};
    }

    quizWords = vocab.filter(word => !quizStudiedWords[word.de]);
    console.log('📝 Слов для тренировки:', quizWords.length);
    
    if (quizWords.length === 0) {
        quizWords = [...vocab];
        quizStudiedWords = {};
        localStorage.removeItem('dm_quiz_studied_' + currentLessonId);
    }
    
    quizIndex = 0;
    quizDirection = 'de_to_ru';

    let html = `
        <div style="text-align: center;">
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

    // ===== КНОПКА НАПРАВЛЕНИЯ В ШАПКЕ =====
    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="quizDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
            </button>
        `;
        document.getElementById('quizDirBtn').addEventListener('click', function() {
            quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            showQuizQuestion();
        });
    }

    // ===== НАЗНАЧАЕМ ОБРАБОТЧИКИ =====
    document.getElementById('quizStudyBtn').addEventListener('click', function() {
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
    });

    document.getElementById('quizContainerBtn').addEventListener('click', function() {
        console.log('📦 Кнопка "В КОНТЕЙНЕР" нажата');
        const studied = getStudiedWordsList();
        console.log('📦 Изученных слов:', studied?.length);
        
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showQuizContainer();
    });

    document.getElementById('quizPrevBtn').addEventListener('click', function() {
        if (quizWords.length > 0 && quizIndex > 0) {
            quizIndex--;
            showQuizQuestion();
        }
    });

    document.getElementById('quizNextBtn').addEventListener('click', function() {
        if (quizWords.length > 0) {
            quizIndex = (quizIndex + 1) % quizWords.length;
            showQuizQuestion();
        }
    });

    document.getElementById('quizResetStartBtn').addEventListener('click', function() {
        if (quizWords.length > 0) {
            quizIndex = 0;
            showQuizQuestion();
        }
    });

    showQuizQuestion();
}

function saveQuizState() {
    try {
        localStorage.setItem('dm_quiz_studied_' + currentLessonId, JSON.stringify(quizStudiedWords));
        console.log('💾 Сохранено изученных слов:', Object.keys(quizStudiedWords).length);
    } catch(e) {}
}

function getStudiedWordsList() {
    const lesson = currentLessonData || window.currentLesson;
    if (!lesson) {
        console.warn('⚠️ currentLessonData не найден');
        return [];
    }
    const vocab = lesson.vocabulary || [];
    const result = vocab.filter(word => quizStudiedWords[word.de]);
    return result;
}

// ===== КОНТЕЙНЕР (РАБОЧАЯ ВЕРСИЯ) =====
function showQuizContainer() {
    console.log('📦 showQuizContainer вызван');
    
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

    const currentStudied = getStudiedWordsList();
    console.log('📦 Изученных слов:', currentStudied.length);

    // Заголовок
    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">📦 КОНТЕЙНЕР (${currentStudied.length} слов)</h3>`;
    modalContent.appendChild(header);

    // Список слов
    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'overflow-y: auto; flex: 1; padding: 5px 0;';
    
    if (currentStudied.length === 0) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>`;
    } else {
        currentStudied.forEach((word) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <span><strong>${word.de}</strong> — ${word.ru}</span>
                <button class="unstudy-btn" data-word="${word.de}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            
            const btn = item.querySelector('.unstudy-btn');
            btn.addEventListener('click', function() {
                const wordDe = this.getAttribute('data-word');
                console.log('🔄 Возвращаем слово:', wordDe);
                delete quizStudiedWords[wordDe];
                saveQuizState();
                const lesson = currentLessonData || window.currentLesson;
                if (lesson) {
                    const vocab = lesson.vocabulary || [];
                    quizWords = vocab.filter(w => !quizStudiedWords[w.de]);
                }
                if (quizWords.length > 0 && quizIndex >= quizWords.length) {
                    quizIndex = 0;
                }
                modal.remove();
                showQuizContainer();
                if (getStudiedWordsList().length === 0) {
                    if (quizWords.length > 0) showQuizQuestion();
                }
            });
            
            itemsContainer.appendChild(item);
        });
    }
    modalContent.appendChild(itemsContainer);

    // Нижняя панель
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

    // Обработчик "ВЕРНУТЬ ВСЁ"
    document.getElementById('returnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все слова из контейнера?')) return;
        console.log('🔄 Возвращаем все слова');
        const lesson = currentLessonData || window.currentLesson;
        if (lesson) {
            const vocab = lesson.vocabulary || [];
            vocab.forEach(word => { delete quizStudiedWords[word.de]; });
        }
        saveQuizState();
        const lesson2 = currentLessonData || window.currentLesson;
        if (lesson2) {
            quizWords = [...lesson2.vocabulary];
        }
        quizIndex = 0;
        modal.remove();
        showQuizQuestion();
    });

    // Обработчик "ЗАКРЫТЬ"
    document.getElementById('closeContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    // Закрытие по клику на фон
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
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
        btn.addEventListener('click', function() {
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
        });
        grid.appendChild(btn);
    });
}
