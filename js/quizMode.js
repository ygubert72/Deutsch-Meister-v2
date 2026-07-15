// ====================================================================
// quizMode.js — Тест (выбор перевода из 6 вариантов)
// ====================================================================

let quizWords = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizDirection = 'de_to_ru';
let quizStudiedWords = {};
let currentLessonId = null;
let currentLessonData = null;
let allQuizWords = [];

// ===== ДЛЯ РЕЖИМА "ВСЕ СЛОВА УРОВНЯ" =====
let isAllWordsMode = false;
let allLevelWords = [];

// ===== КЛЮЧ ДЛЯ ОБЩЕГО КОНТЕЙНЕРА =====
function getLevelContainerKey(level) {
    return 'dm_level_studied_' + level;
}

// ===== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ =====
async function loadAllWordsForLevel(level) {
    try {
        const indexResponse = await fetch(`docs/${level}/index.json`);
        if (!indexResponse.ok) throw new Error('Не удалось загрузить индекс уровня');
        const indexData = await indexResponse.json();
        
        let allWords = [];
        const seen = new Set();
        
        for (const lesson of indexData.lessons) {
            const lessonId = lesson.id;
            const lessonFile = `docs/${level}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            
            try {
                const response = await fetch(lessonFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.quiz && Array.isArray(data.quiz)) {
                        for (const word of data.quiz) {
                            if (!seen.has(word.de)) {
                                seen.add(word.de);
                                allWords.push(word);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        
        return allWords;
        
    } catch(e) {
        console.error('Ошибка загрузки слов уровня:', e);
        return [];
    }
}

// ===== ЗАГРУЗКА ПРОГРЕССА =====
function loadStudiedWords(level) {
    const key = getLevelContainerKey(level);
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            quizStudiedWords = JSON.parse(saved);
        } else {
            quizStudiedWords = {};
        }
    } catch(e) {
        quizStudiedWords = {};
    }
}

// ===== СОХРАНЕНИЕ ПРОГРЕССА =====
function saveStudiedWords(level) {
    const key = getLevelContainerKey(level);
    try {
        localStorage.setItem(key, JSON.stringify(quizStudiedWords));
    } catch(e) {
        console.warn('Ошибка сохранения контейнера:', e);
    }
}

// ===== ВНЕШНИЙ ВЫЗОВ ДЛЯ РЕЖИМА "ВСЕ СЛОВА" =====
window.loadAllWordsMode = async function(level) {
    console.log('🔄 loadAllWordsMode вызван для уровня:', level);
    isAllWordsMode = true;
    window.currentLevel = level;
    
    allLevelWords = await loadAllWordsForLevel(level);
    console.log('📚 Загружено слов:', allLevelWords.length);
    
    loadStudiedWords(level);
    
    allQuizWords = [...allLevelWords];
    quizWords = allLevelWords.filter(word => !quizStudiedWords[word.de]);
    
    if (quizWords.length === 0 && allLevelWords.length > 0) {
        quizWords = [...allLevelWords];
    }
    
    quizIndex = 0;
    quizDirection = 'de_to_ru';
    
    showQuizInterfaceDirect();
};

// ===== ОСНОВНАЯ ФУНКЦИЯ ДЛЯ УРОКОВ =====
function renderQuiz(container, lesson) {
    isAllWordsMode = false;
    currentLessonData = lesson;
    currentLessonId = lesson.id || 1;
    window.currentLevel = lesson.level || 'A1';
    
    loadStudiedWords(window.currentLevel);
    
    let quizData = lesson.quiz || [];
    
    if (!quizData || quizData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📭 Нет слов для теста</div>';
        return;
    }

    allQuizWords = [...quizData];
    quizWords = quizData.filter(word => !quizStudiedWords[word.de]);
    
    if (quizWords.length === 0 && allQuizWords.length > 0) {
        quizWords = [...allQuizWords];
    }
    
    quizIndex = 0;
    quizDirection = 'de_to_ru';

    showQuizInterface(container);
}

// ===== ПОКАЗ ТЕСТА ВНУТРИ КОНТЕЙНЕРА (для уроков) =====
function showQuizInterface(container) {
    if (!container) {
        console.error('❌ container не передан в showQuizInterface');
        return;
    }
    buildQuizHTML(container);
}

// ===== ПОКАЗ ТЕСТА НАПРЯМУЮ В #content (для "Все слова") =====
function showQuizInterfaceDirect() {
    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ content не найден!');
        return;
    }
    console.log('✅ showQuizInterfaceDirect: показываем тест в #content');
    buildQuizHTML(content);
}

// ===== ПОСТРОЕНИЕ HTML ТЕСТА =====
function buildQuizHTML(container) {
    if (!container) {
        console.error('❌ buildQuizHTML: container не передан');
        return;
    }
    
    const hasWords = allQuizWords.length > 0;
    const totalWords = allQuizWords.length;
    const studiedCount = Object.keys(quizStudiedWords).filter(key => quizStudiedWords[key] === true).length;
    const progress = totalWords > 0 ? Math.round((studiedCount / totalWords) * 100) : 0;

    let html = `
        <div style="text-align: center;">
            ${isAllWordsMode && hasWords ? `
                <div style="background: #E8F5E9; border-radius: 12px; padding: 10px 15px; margin-bottom: 15px; border: 2px solid #4CAF50;">
                    <div style="font-weight: bold; color: #2E7D32;">📊 Прогресс уровня: ${studiedCount} из ${totalWords} слов изучено (${progress}%)</div>
                    <div style="background: #E0E0E0; border-radius: 10px; height: 8px; margin-top: 6px; overflow: hidden;">
                        <div style="background: #4CAF50; height: 100%; width: ${progress}%; border-radius: 10px; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            ` : ''}
        
            ${!hasWords ? `
                <div style="padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <div>Нет слов для этого режима</div>
                </div>
            ` : `
                <!-- ===== ОДНА СТРОКА: СТАРАЯ КНОПКА "К СПИСКУ УРОКОВ" + КНОПКА НАПРАВЛЕНИЯ ===== -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                    <button class="back-btn" onclick="window.renderLevel()" style="padding: 10px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.08s ease;">
                        ← К СПИСКУ УРОКОВ
                    </button>
                    <button id="quizDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                        ${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
                    </button>
                </div>
                
                ${isAllWordsMode ? `
                    <h2>🌍 Все слова уровня ${window.currentLevel}</h2>
                ` : `
                    <h2>🎯 Тест: Урок ${currentLessonId}</h2>
                `}
                
                <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 550px; margin: 15px auto; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                    <div style="font-size: 32px; font-weight: bold; color: #1A1A1A;" id="quizQuestion">Загрузка...</div>
                </div>
                <div class="quiz-grid" id="quizGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 700px; margin: 20px auto;"></div>
                <div style="font-size: 14px; color: #888; margin-top: 10px;" id="quizProgress">0 / 0</div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 10px 0 5px 0;">
                    <button class="ctrl-btn" id="quizStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                    <button class="ctrl-btn" id="quizContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
                </div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 5px 0 10px 0;">
                    <button class="ctrl-btn" id="quizPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                    <button class="ctrl-btn" id="quizNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                    <button class="ctrl-btn" id="quizResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ buildQuizHTML: контент вставлен');

    if (!hasWords) return;

    document.getElementById('quizDirBtn').addEventListener('click', function() {
        quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        this.textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        showQuizQuestion();
    });

    document.getElementById('quizStudyBtn').addEventListener('click', function() {
        if (quizCurrentWord) {
            quizStudiedWords[quizCurrentWord.de] = true;
            saveStudiedWords(window.currentLevel);
            
            quizWords = (isAllWordsMode ? allQuizWords : allQuizWords).filter(w => !quizStudiedWords[w.de]);
            
            if (quizWords.length === 0 && allQuizWords.length > 0) {
                quizWords = [...allQuizWords];
            }
            
            if (quizIndex >= quizWords.length && quizWords.length > 0) {
                quizIndex = 0;
            }
            
            if (isAllWordsMode) {
                updateProgressDisplay();
            }
            
            showQuizQuestion();
        }
    });

    document.getElementById('quizContainerBtn').addEventListener('click', function() {
        const studied = getStudiedWordsList();
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

function updateProgressDisplay() {
    const total = allQuizWords.length;
    const studiedCount = Object.keys(quizStudiedWords).filter(key => quizStudiedWords[key] === true).length;
    const progress = total > 0 ? Math.round((studiedCount / total) * 100) : 0;
    
    const progressBar = document.querySelector('#modeContent .progress-bar-inner');
    const progressText = document.querySelector('#modeContent .progress-text');
    
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    if (progressText) {
        progressText.textContent = `${studiedCount} из ${total} слов изучено (${progress}%)`;
    }
}

function getStudiedWordsList() {
    if (!allQuizWords) return [];
    return allQuizWords.filter(word => quizStudiedWords[word.de]);
}

// ===== КОНТЕЙНЕР =====
function showQuizContainer() {
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
    const title = isAllWordsMode ? 
        '📦 КОНТЕЙНЕР УРОВНЯ ' + window.currentLevel + ' (' + currentStudied.length + ' слов)' :
        '📦 КОНТЕЙНЕР УРОКА ' + currentLessonId + ' (' + currentStudied.length + ' слов)';

    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #ddd; text-align: center; flex-shrink: 0;';
    header.innerHTML = `<h3 style="margin: 0;">${title}</h3>`;
    modalContent.appendChild(header);

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
                delete quizStudiedWords[wordDe];
                saveStudiedWords(window.currentLevel);
                
                quizWords = (isAllWordsMode ? allQuizWords : allQuizWords).filter(w => !quizStudiedWords[w.de]);
                if (quizWords.length === 0 && allQuizWords.length > 0) {
                    quizWords = [...allQuizWords];
                }
                if (quizWords.length > 0 && quizIndex >= quizWords.length) {
                    quizIndex = 0;
                }
                
                modal.remove();
                showQuizContainer();
                showQuizQuestion();
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

    document.getElementById('returnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все слова из контейнера?')) return;
        allQuizWords.forEach(word => { delete quizStudiedWords[word.de]; });
        saveStudiedWords(window.currentLevel);
        quizWords = [...allQuizWords];
        quizIndex = 0;
        modal.remove();
        showQuizQuestion();
    });

    document.getElementById('closeContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ===== ПОКАЗ ВОПРОСА =====
function showQuizQuestion() {
    const questionEl = document.getElementById('quizQuestion');
    const gridEl = document.getElementById('quizGrid');
    const progressEl = document.getElementById('quizProgress');
    
    if (!questionEl || !gridEl) return;

    if (quizWords.length === 0) {
        questionEl.textContent = '🎉 Все слова изучены!';
        gridEl.innerHTML = '';
        if (progressEl) progressEl.textContent = '0 / 0';
        return;
    }

    quizCurrentWord = quizWords[quizIndex];
    const isDeToRu = quizDirection === 'de_to_ru';
    const question = isDeToRu ? quizCurrentWord.de : quizCurrentWord.ru;
    const correctAnswer = isDeToRu ? quizCurrentWord.ru : quizCurrentWord.de;

    questionEl.textContent = question;
    if (progressEl) progressEl.textContent = `${quizIndex + 1} / ${quizWords.length}`;

    const allWords = [...allQuizWords];
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

    gridEl.innerHTML = '';
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
        gridEl.appendChild(btn);
    });
}

// ===== ЭКСПОРТ =====
window.renderQuiz = renderQuiz;
window.loadAllWordsMode = loadAllWordsMode;
