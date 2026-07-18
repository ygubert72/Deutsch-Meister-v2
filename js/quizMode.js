// ====================================================================
// quizMode.js — Тест (выбор перевода из 6 вариантов)
// ====================================================================

// ====================================================================
// СТАРАЯ ЛОГИКА ДЛЯ ТЕСТА В УРОКАХ (НЕ ТРОГАЕМ)
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

// ===== НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" (НЕЗАВИСИМЫЙ КОНТЕЙНЕР) =====
let levelAllWords = [];           // Все слова уровня из файла docs/{level}.json
let levelStudiedWords = {};       // Изученные слова для "Всех слов уровня"
let levelQuizWords = [];          // Слова для показа (не изученные)
let levelQuizIndex = 0;
let levelCurrentWord = null;
let levelDirection = 'de_to_ru';
let currentLevelForAllWords = 'A1';

// ===== КЛЮЧИ ДЛЯ ХРАНЕНИЯ =====
function getLessonContainerKey(level, lessonId) {
    return 'dm_lesson_studied_' + level + '_' + lessonId;
}

function getLevelContainerKey(level) {
    return 'dm_level_studied_' + level;
}

// ===== ЗАГРУЗКА ПРОГРЕССА ДЛЯ УРОКА =====
function loadLessonStudiedWords(level, lessonId) {
    const key = getLessonContainerKey(level, lessonId);
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

// ===== СОХРАНЕНИЕ ПРОГРЕССА ДЛЯ УРОКА =====
function saveLessonStudiedWords(level, lessonId) {
    const key = getLessonContainerKey(level, lessonId);
    try {
        localStorage.setItem(key, JSON.stringify(quizStudiedWords));
    } catch(e) {
        console.warn('Ошибка сохранения контейнера урока:', e);
    }
}

// ===== ЗАГРУЗКА ПРОГРЕССА ДЛЯ УРОВНЯ (НОВЫЙ КОНТЕЙНЕР) =====
function loadLevelStudiedWords(level) {
    const key = getLevelContainerKey(level);
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            levelStudiedWords = JSON.parse(saved);
        } else {
            levelStudiedWords = {};
        }
    } catch(e) {
        levelStudiedWords = {};
    }
}

// ===== СОХРАНЕНИЕ ПРОГРЕССА ДЛЯ УРОВНЯ (НОВЫЙ КОНТЕЙНЕР) =====
function saveLevelStudiedWords(level) {
    const key = getLevelContainerKey(level);
    try {
        localStorage.setItem(key, JSON.stringify(levelStudiedWords));
    } catch(e) {
        console.warn('Ошибка сохранения контейнера уровня:', e);
    }
}

// ===== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ИЗ ФАЙЛА docs/{level}.json =====
async function loadLevelWordsFromFile(level) {
    try {
        const response = await fetch(`docs/${level}.json`);
        if (!response.ok) {
            throw new Error(`Файл docs/${level}.json не найден`);
        }
        const words = await response.json();
        return words;
    } catch(e) {
        console.error('Ошибка загрузки слов уровня:', e);
        return [];
    }
}

// ===== ЗАГРУЗКА ВСЕХ СЛОВ УРОВНЯ ИЗ УРОКОВ (СТАРАЯ ЛОГИКА - ОСТАВЛЯЕМ ДЛЯ СОВМЕСТИМОСТИ) =====
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

// ================================================================
// НОВАЯ ЛОГИКА ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" (НЕЗАВИСИМЫЙ КОНТЕЙНЕР)
// ================================================================

// ===== ВНЕШНИЙ ВЫЗОВ ДЛЯ РЕЖИМА "ВСЕ СЛОВА" =====
window.loadAllWordsMode = async function(level) {
    console.log('🔄 loadAllWordsMode вызван для уровня:', level);
    isAllWordsMode = true;
    currentLevelForAllWords = level;
    window.currentLevel = level;
    
    // Загружаем слова из файла docs/{level}.json
    levelAllWords = await loadLevelWordsFromFile(level);
    console.log('📚 Загружено слов из файла уровня:', levelAllWords.length);
    
    // Загружаем прогресс для уровня (НОВЫЙ КОНТЕЙНЕР)
    loadLevelStudiedWords(level);
    
    // Формируем список слов для показа
    levelQuizWords = levelAllWords.filter(word => !levelStudiedWords[word.de]);
    
    if (levelQuizWords.length === 0 && levelAllWords.length > 0) {
        levelQuizWords = [...levelAllWords];
    }
    
    levelQuizIndex = 0;
    levelDirection = 'de_to_ru';
    
    showLevelQuizInterfaceDirect();
};

// ===== ПОКАЗ ТЕСТА ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" =====
function showLevelQuizInterfaceDirect() {
    const content = document.getElementById('content');
    if (!content) {
        console.error('❌ content не найден!');
        return;
    }
    console.log('✅ showLevelQuizInterfaceDirect: показываем тест для всех слов уровня');
    buildLevelQuizHTML(content);
}

// ===== ПОСТРОЕНИЕ HTML ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" =====
function buildLevelQuizHTML(container) {
    if (!container) {
        console.error('❌ buildLevelQuizHTML: container не передан');
        return;
    }
    
    const hasWords = levelAllWords.length > 0;

    let html = `
        <div style="text-align: center;">
            ${!hasWords ? `
                <div style="padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <div>Нет слов для этого уровня</div>
                </div>
            ` : `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                    <button class="back-btn" onclick="window.renderLevel()" style="padding: 10px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.08s ease;">
                        ← НАЗАД
                    </button>
                    <div id="levelHeaderControls">
                        <button id="levelDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                            ${levelDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
                        </button>
                    </div>
                </div>
                <h2>📚 Все слова уровня ${currentLevelForAllWords}</h2>
                
                <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 550px; margin: 15px auto; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                    <div style="font-size: 32px; font-weight: bold; color: #1A1A1A;" id="levelQuizQuestion">Загрузка...</div>
                </div>
                <div class="quiz-grid" id="levelQuizGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 700px; margin: 20px auto;"></div>
                <div style="font-size: 14px; color: #888; margin-top: 10px;" id="levelQuizProgress">0 / 0</div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 10px 0 5px 0;">
                    <button class="ctrl-btn" id="levelStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                    <button class="ctrl-btn" id="levelContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
                    <button class="ctrl-btn" id="levelSpeakBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔊 ОЗВУЧИТЬ</button>
                    <button class="ctrl-btn" id="levelShuffleBtn" style="padding: 6px 14px; background: #9C27B0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔄 ПЕРЕМЕШАТЬ</button>
                </div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 5px 0 10px 0;">
                    <button class="ctrl-btn" id="levelPrevBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">◀ НАЗАД</button>
                    <button class="ctrl-btn" id="levelNextBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">ВПЕРЕД ▶</button>
                    <button class="ctrl-btn" id="levelResetStartBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">⏮ В НАЧАЛО</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ buildLevelQuizHTML: контент вставлен');

    if (!hasWords) return;

    // ===== ОБРАБОТЧИКИ ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" =====
    
    // Кнопка направления
    const dirBtn = document.getElementById('levelDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            levelDirection = levelDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.textContent = levelDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            showLevelQuizQuestion();
        });
    }

    // Изучено
    document.getElementById('levelStudyBtn').addEventListener('click', function() {
        if (levelCurrentWord) {
            levelStudiedWords[levelCurrentWord.de] = true;
            saveLevelStudiedWords(currentLevelForAllWords);
            
            levelQuizWords = levelAllWords.filter(w => !levelStudiedWords[w.de]);
            
            if (levelQuizWords.length === 0 && levelAllWords.length > 0) {
                levelQuizWords = [...levelAllWords];
            }
            
            if (levelQuizIndex >= levelQuizWords.length && levelQuizWords.length > 0) {
                levelQuizIndex = 0;
            }
            
            showLevelQuizQuestion();
        }
    });

    // Контейнер
    document.getElementById('levelContainerBtn').addEventListener('click', function() {
        const studied = getLevelStudiedWordsList();
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showLevelContainer();
    });

    // Озвучить
    document.getElementById('levelSpeakBtn').addEventListener('click', function() {
        if (levelCurrentWord && levelCurrentWord.de) {
            if (typeof window.speak === 'function') {
                window.speak(levelCurrentWord.de);
            } else {
                console.warn('⚠️ Функция speak не найдена');
            }
        }
    });

    // Перемешать
    document.getElementById('levelShuffleBtn').addEventListener('click', function() {
        if (!levelAllWords || levelAllWords.length === 0) return;
        
        for (let i = levelAllWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [levelAllWords[i], levelAllWords[j]] = [levelAllWords[j], levelAllWords[i]];
        }
        
        levelQuizWords = levelAllWords.filter(word => !levelStudiedWords[word.de]);
        
        if (levelQuizWords.length === 0 && levelAllWords.length > 0) {
            levelQuizWords = [...levelAllWords];
        }
        
        levelQuizIndex = 0;
        showLevelQuizQuestion();
        
        console.log('🔄 Слова уровня перемешаны');
    });

    // Назад
    document.getElementById('levelPrevBtn').addEventListener('click', function() {
        if (levelQuizWords.length > 0 && levelQuizIndex > 0) {
            levelQuizIndex--;
            showLevelQuizQuestion();
        }
    });

    // Вперед
    document.getElementById('levelNextBtn').addEventListener('click', function() {
        if (levelQuizWords.length > 0) {
            levelQuizIndex = (levelQuizIndex + 1) % levelQuizWords.length;
            showLevelQuizQuestion();
        }
    });

    // В начало
    document.getElementById('levelResetStartBtn').addEventListener('click', function() {
        if (levelQuizWords.length > 0) {
            levelQuizIndex = 0;
            showLevelQuizQuestion();
        }
    });

    showLevelQuizQuestion();
}

// ===== ПОЛУЧЕНИЕ СПИСКА ИЗУЧЕННЫХ СЛОВ ДЛЯ УРОВНЯ =====
function getLevelStudiedWordsList() {
    if (!levelAllWords) return [];
    return levelAllWords.filter(word => levelStudiedWords[word.de]);
}

// ===== КОНТЕЙНЕР ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" =====
function showLevelContainer() {
    const oldModal = document.getElementById('levelContainerModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'levelContainerModal';
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

    const currentStudied = getLevelStudiedWordsList();
    const title = `📦 КОНТЕЙНЕР УРОВНЯ ${currentLevelForAllWords} (${currentStudied.length} слов)`;

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
                <button class="unstudy-level-btn" data-word="${word.de}" style="padding: 4px 14px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold;">✕ ВЕРНУТЬ</button>
            `;
            
            const btn = item.querySelector('.unstudy-level-btn');
            btn.addEventListener('click', function() {
                const wordDe = this.getAttribute('data-word');
                delete levelStudiedWords[wordDe];
                saveLevelStudiedWords(currentLevelForAllWords);
                
                levelQuizWords = levelAllWords.filter(w => !levelStudiedWords[w.de]);
                if (levelQuizWords.length === 0 && levelAllWords.length > 0) {
                    levelQuizWords = [...levelAllWords];
                }
                if (levelQuizWords.length > 0 && levelQuizIndex >= levelQuizWords.length) {
                    levelQuizIndex = 0;
                }
                
                modal.remove();
                showLevelContainer();
                showLevelQuizQuestion();
            });
            
            itemsContainer.appendChild(item);
        });
    }
    modalContent.appendChild(itemsContainer);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 15px 20px; border-top: 1px solid #ddd; display: flex; gap: 10px; flex-shrink: 0;';
    footer.innerHTML = `
        <button id="levelReturnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔄 ВЕРНУТЬ ВСЁ</button>
        <button id="levelCloseContainerBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">ЗАКРЫТЬ</button>
    `;
    modalContent.appendChild(footer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    document.getElementById('levelReturnAllBtn').addEventListener('click', function() {
        if (!confirm('Вернуть все слова из контейнера?')) return;
        levelAllWords.forEach(word => { delete levelStudiedWords[word.de]; });
        saveLevelStudiedWords(currentLevelForAllWords);
        levelQuizWords = [...levelAllWords];
        levelQuizIndex = 0;
        modal.remove();
        showLevelQuizQuestion();
    });

    document.getElementById('levelCloseContainerBtn').addEventListener('click', function() {
        modal.remove();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}

// ===== ПОКАЗ ВОПРОСА ДЛЯ "ВСЕХ СЛОВ УРОВНЯ" =====
function showLevelQuizQuestion() {
    const questionEl = document.getElementById('levelQuizQuestion');
    const gridEl = document.getElementById('levelQuizGrid');
    const progressEl = document.getElementById('levelQuizProgress');
    
    if (!questionEl || !gridEl) return;

    if (levelQuizWords.length === 0) {
        questionEl.textContent = '🎉 Все слова изучены!';
        gridEl.innerHTML = '';
        if (progressEl) progressEl.textContent = '0 / 0';
        return;
    }

    levelCurrentWord = levelQuizWords[levelQuizIndex];
    const isDeToRu = levelDirection === 'de_to_ru';
    const question = isDeToRu ? levelCurrentWord.de : levelCurrentWord.ru;
    const correctAnswer = isDeToRu ? levelCurrentWord.ru : levelCurrentWord.de;

    questionEl.textContent = question;
    if (progressEl) progressEl.textContent = `${levelQuizIndex + 1} / ${levelQuizWords.length}`;

    const allWords = [...levelAllWords];
    const otherWords = allWords.filter(w => w !== levelCurrentWord);
    
    const shuffled = [...otherWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const options = [levelCurrentWord, ...shuffled.slice(0, 5)];
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
                    levelQuizIndex = (levelQuizIndex + 1) % levelQuizWords.length;
                    showLevelQuizQuestion();
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


// ====================================================================
// СТАРАЯ ЛОГИКА ДЛЯ ТЕСТА В УРОКАХ (НЕ ТРОГАЕМ)
// ====================================================================

// ===== ОСНОВНАЯ ФУНКЦИЯ ДЛЯ УРОКОВ =====
function renderQuiz(container, lesson) {
    isAllWordsMode = false;
    currentLessonData = lesson;
    currentLessonId = lesson.id || 1;
    window.currentLevel = lesson.level || 'A1';
    
    // Загружаем прогресс для УРОКА (старый контейнер)
    loadLessonStudiedWords(window.currentLevel, currentLessonId);
    
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

// ===== ПОСТРОЕНИЕ HTML ДЛЯ ТЕСТА В УРОКЕ =====
function buildQuizHTML(container) {
    if (!container) {
        console.error('❌ buildQuizHTML: container не передан');
        return;
    }
    
    const hasWords = allQuizWords.length > 0;

    // ===== ПОМЕЩАЕМ КНОПКУ НАПРАВЛЕНИЯ В HEADER =====
    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = `
            <button id="quizDirBtn" class="dir-btn" style="background: #3B6FE0; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                ${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}
            </button>
        `;
    }

    let html = `
        <div style="text-align: center;">
            ${!hasWords ? `
                <div style="padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                    <div>Нет слов для этого режима</div>
                </div>
            ` : `
                <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 550px; margin: 15px auto; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                    <div style="font-size: 32px; font-weight: bold; color: #1A1A1A;" id="quizQuestion">Загрузка...</div>
                </div>
                <div class="quiz-grid" id="quizGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; max-width: 700px; margin: 20px auto;"></div>
                <div style="font-size: 14px; color: #888; margin-top: 10px;" id="quizProgress">0 / 0</div>
                
                <div class="btn-group" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 10px 0 5px 0;">
                    <button class="ctrl-btn" id="quizStudyBtn" style="padding: 6px 14px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">✅ ИЗУЧЕНО</button>
                    <button class="ctrl-btn" id="quizContainerBtn" style="padding: 6px 14px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">📦 КОНТЕЙНЕР</button>
                    <button class="ctrl-btn" id="quizSpeakBtn" style="padding: 6px 14px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px;">🔊 ОЗВУЧИТЬ</button>
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

    // ===== ОБРАБОТЧИКИ ДЛЯ ТЕСТА В УРОКЕ =====
    
    // Кнопка направления
    const dirBtn = document.getElementById('quizDirBtn');
    if (dirBtn) {
        dirBtn.addEventListener('click', function() {
            quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            showQuizQuestion();
        });
    }

    // Изучено
    document.getElementById('quizStudyBtn').addEventListener('click', function() {
        if (quizCurrentWord) {
            quizStudiedWords[quizCurrentWord.de] = true;
            saveLessonStudiedWords(window.currentLevel, currentLessonId);
            
            quizWords = allQuizWords.filter(w => !quizStudiedWords[w.de]);
            
            if (quizWords.length === 0 && allQuizWords.length > 0) {
                quizWords = [...allQuizWords];
            }
            
            if (quizIndex >= quizWords.length && quizWords.length > 0) {
                quizIndex = 0;
            }
            
            showQuizQuestion();
        }
    });

    // Контейнер
    document.getElementById('quizContainerBtn').addEventListener('click', function() {
        const studied = getLessonStudiedWordsList();
        if (!studied || studied.length === 0) {
            alert('📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.');
            return;
        }
        showLessonContainer();
    });

    // Озвучить
    document.getElementById('quizSpeakBtn').addEventListener('click', function() {
        if (quizCurrentWord && quizCurrentWord.de) {
            if (typeof window.speak === 'function') {
                window.speak(quizCurrentWord.de);
            } else {
                console.warn('⚠️ Функция speak не найдена');
            }
        }
    });

    // Назад
    document.getElementById('quizPrevBtn').addEventListener('click', function() {
        if (quizWords.length > 0 && quizIndex > 0) {
            quizIndex--;
            showQuizQuestion();
        }
    });

    // Вперед
    document.getElementById('quizNextBtn').addEventListener('click', function() {
        if (quizWords.length > 0) {
            quizIndex = (quizIndex + 1) % quizWords.length;
            showQuizQuestion();
        }
    });

    // В начало
    document.getElementById('quizResetStartBtn').addEventListener('click', function() {
        if (quizWords.length > 0) {
            quizIndex = 0;
            showQuizQuestion();
        }
    });

    showQuizQuestion();
}

// ===== ПОЛУЧЕНИЕ СПИСКА ИЗУЧЕННЫХ СЛОВ ДЛЯ УРОКА =====
function getLessonStudiedWordsList() {
    if (!allQuizWords) return [];
    return allQuizWords.filter(word => quizStudiedWords[word.de]);
}

// ===== КОНТЕЙНЕР ДЛЯ УРОКА =====
function showLessonContainer() {
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

    const currentStudied = getLessonStudiedWordsList();
    const title = `📦 КОНТЕЙНЕР УРОКА ${currentLessonId} (${currentStudied.length} слов)`;

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
                saveLessonStudiedWords(window.currentLevel, currentLessonId);
                
                quizWords = allQuizWords.filter(w => !quizStudiedWords[w.de]);
                if (quizWords.length === 0 && allQuizWords.length > 0) {
                    quizWords = [...allQuizWords];
                }
                if (quizWords.length > 0 && quizIndex >= quizWords.length) {
                    quizIndex = 0;
                }
                
                modal.remove();
                showLessonContainer();
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
        saveLessonStudiedWords(window.currentLevel, currentLessonId);
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

// ===== ПОКАЗ ВОПРОСА ДЛЯ ТЕСТА В УРОКЕ =====
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
