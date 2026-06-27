// ====================================================================
// app.js — ГЛАВНЫЙ ФАЙЛ (навигация, загрузка, сохранение состояния)
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let courseData = null;
let isRestoring = false;

// Хранилище загруженных данных для текущего урока
let lessonDataCache = {
    grammar: null,
    vocabulary: null,
    practice: null,
    quiz: null,
    trainer: null,
    dictation: null
};

// ========== СОХРАНЕНИЕ СОСТОЯНИЯ ==========
function saveState() {
    try {
        const state = {
            level: currentLevel,
            lessonId: currentLesson?.id || null,
            mode: currentMode || 'grammar'
        };
        localStorage.setItem('dm_app_state', JSON.stringify(state));
        console.log('💾 Состояние сохранено:', state);
    } catch(e) {
        console.log('Ошибка сохранения состояния:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('dm_app_state');
        if (saved) {
            const state = JSON.parse(saved);
            console.log('📂 Состояние загружено из localStorage:', state);
            return state;
        }
    } catch(e) {
        console.log('Ошибка загрузки состояния:', e);
    }
    return null;
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadLevel(level) {
    currentLevel = level;
    console.log('📚 Загрузка уровня:', level);
    try {
        const response = await fetch(`docs/course/${level}/index.json`);
        if (!response.ok) throw new Error('Курс не найден');
        courseData = await response.json();
        console.log('✅ Курс загружен:', courseData.title);
        renderLevel();
        saveState();
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

// ========== ЗАГРУЗКА УРОКА ==========
async function loadLesson(lessonId) {
    console.log('📖 Загрузка урока:', lessonId);
    try {
        const lessonInfo = courseData.lessons.find(l => l.id === lessonId);
        if (!lessonInfo) throw new Error('Урок не найден');
        
        // Сбрасываем кеш
        lessonDataCache = {
            grammar: null,
            vocabulary: null,
            practice: null,
            quiz: null,
            trainer: null,
            dictation: null
        };
        
        // Пытаемся загрузить основной файл урока (старый формат)
        let lesson = null;
        try {
            const response = await fetch(`docs/course/${currentLevel}/lessons/${lessonInfo.file}`);
            if (response.ok) {
                lesson = await response.json();
                console.log('✅ Урок загружен (старый формат):', lesson.title);
                
                lessonDataCache.grammar = lesson;
                lessonDataCache.vocabulary = lesson.vocabulary || null;
                lessonDataCache.practice = lesson.practice || null;
                lessonDataCache.quiz = lesson.quiz || null;
                lessonDataCache.trainer = lesson.trainer || null;
                lessonDataCache.dictation = lesson.dictation || null;
            }
        } catch(e) {
            console.log('ℹ️ Старый формат не найден, пробуем новый');
        }
        
        // Если старый формат не загрузился, пробуем новый (раздельный)
        if (!lesson) {
            lesson = {
                id: lessonId,
                title: lessonInfo.title,
                level: currentLevel
            };
            
            // Загружаем грамматику
            try {
                const grammarResponse = await fetch(`docs/course/${currentLevel}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`);
                if (grammarResponse.ok) {
                    const grammarData = await grammarResponse.json();
                    lesson.grammar = grammarData.grammar || '';
                    lesson.examples = grammarData.examples || [];
                    lessonDataCache.grammar = grammarData;
                    console.log('✅ Грамматика загружена (новый формат)');
                }
            } catch(e) {
                console.log('ℹ️ Грамматика не найдена');
            }
            
            // Загружаем лексику
            try {
                const vocabResponse = await fetch(`docs/course/${currentLevel}/vocabulary/vocab_${String(lessonId).padStart(2, '0')}.json`);
                if (vocabResponse.ok) {
                    const vocabData = await vocabResponse.json();
                    lesson.vocabulary = vocabData;
                    lessonDataCache.vocabulary = vocabData;
                    console.log('✅ Лексика загружена (новый формат)');
                }
            } catch(e) {
                console.log('ℹ️ Лексика не найдена');
            }
            
            // Загружаем практику
            try {
                const practiceResponse = await fetch(`docs/course/${currentLevel}/practice/practice_${String(lessonId).padStart(2, '0')}.json`);
                if (practiceResponse.ok) {
                    const practiceData = await practiceResponse.json();
                    lesson.practice = practiceData;
                    lessonDataCache.practice = practiceData;
                    console.log('✅ Практика загружена (новый формат)');
                }
            } catch(e) {
                console.log('ℹ️ Практика не найдена');
            }
            
            // Загружаем тренировку (quiz)
            try {
                const quizResponse = await fetch(`docs/course/${currentLevel}/quiz/quiz_${String(lessonId).padStart(2, '0')}.json`);
                if (quizResponse.ok) {
                    const quizData = await quizResponse.json();
                    lesson.quiz = quizData;
                    lessonDataCache.quiz = quizData;
                    console.log('✅ Тренировка загружена (новый формат)');
                }
            } catch(e) {
                console.log('ℹ️ Тренировка не найдена');
            }
            
            // Загружаем тренажёр
            try {
                const trainerResponse = await fetch(`docs/course/${currentLevel}/trainer/trainer_${String(lessonId).padStart(2, '0')}.json`);
                if (trainerResponse.ok) {
                    const trainerData = await trainerResponse.json();
                    lesson.trainer = trainerData;
                    lessonDataCache.trainer = trainerData;
                    console.log('✅ Тренажёр загружен (новый формат)');
                }
            } catch(e) {
                console.log('ℹ️ Тренажёр не найден');
            }
            
            // Загружаем диктант
            try {
                const dictationResponse = await fetch(`docs/course/${currentLevel}/dictation/dictation_${String(lessonId).padStart(2, '0')}.json`);
                if (dictationResponse.ok) {
                    const dictationData = await dictationResponse.json();
                    lesson.dictation = dictationData;
                    lessonDataCache.dictation = dictationData;
                    console.log('✅ Диктант загружен (новый формат)');
                }
            } catch(e) {
                console.log('ℹ️ Диктант не найден');
            }
            
            if (!lesson.grammar && !lesson.vocabulary && !lesson.practice && !lesson.quiz && !lesson.trainer && !lesson.dictation) {
                throw new Error('Не удалось загрузить данные урока в новом формате');
            }
            
            console.log('✅ Урок загружен (новый формат):', lesson.title);
        }
        
        currentLesson = lesson;
        renderLesson(lesson);
        saveState();
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

// ========== ЗАГРУЗКА ДАННЫХ ДЛЯ РЕЖИМА ==========
async function loadModeData(mode, lessonId) {
    if (lessonDataCache[mode]) {
        console.log(`📦 Данные для режима ${mode} взяты из кеша`);
        return lessonDataCache[mode];
    }
    
    const paddedId = String(lessonId).padStart(2, '0');
    const paths = {
        vocabulary: `docs/course/${currentLevel}/vocabulary/vocab_${paddedId}.json`,
        practice: `docs/course/${currentLevel}/practice/practice_${paddedId}.json`,
        quiz: `docs/course/${currentLevel}/quiz/quiz_${paddedId}.json`,
        trainer: `docs/course/${currentLevel}/trainer/trainer_${paddedId}.json`,
        dictation: `docs/course/${currentLevel}/dictation/dictation_${paddedId}.json`
    };
    
    const path = paths[mode];
    if (!path) return null;
    
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Файл не найден');
        const data = await response.json();
        lessonDataCache[mode] = data;
        console.log(`✅ Данные для режима ${mode} загружены`);
        return data;
    } catch(e) {
        console.log(`ℹ️ Данные для режима ${mode} не найдены`);
        return null;
    }
}

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА (ГАРАНТИРОВАННО РАБОЧАЯ ВЕРСИЯ) ==========
function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    
    const activeMode = currentMode || 'grammar';
    
    // Грамматика — скрываем счетчик
    if (activeMode === 'grammar') {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    
    // Показываем счетчик для остальных режимов
    el.style.display = 'inline';
    
    if (!currentLesson) {
        if (courseData) {
            el.textContent = `Уровень ${currentLevel} | Уроков: ${courseData.lessons.length}`;
        } else {
            el.textContent = 'Загрузка...';
        }
        return;
    }
    
    let count = 0;
    let label = '';
    
    // Получаем данные из кеша (самый надёжный источник)
    let dataSource = null;
    const lessonId = currentLesson.id;
    const paddedId = String(lessonId).padStart(2, '0');
    
    switch(activeMode) {
        case 'vocabulary':
            // Сначала кеш, потом currentLesson, потом загрузка
            if (lessonDataCache.vocabulary) {
                dataSource = lessonDataCache.vocabulary;
            } else if (currentLesson.vocabulary) {
                dataSource = currentLesson.vocabulary;
            } else {
                // Пытаемся загрузить синхронно (но это асинхронно, поэтому используем fallback)
                fetch(`docs/course/${currentLevel}/vocabulary/vocab_${paddedId}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            lessonDataCache.vocabulary = data;
                            currentLesson.vocabulary = data;
                            updateCounter();
                        }
                    })
                    .catch(() => {});
                dataSource = [];
            }
            count = dataSource?.length || 0;
            label = 'слов';
            break;
            
        case 'practice':
            if (lessonDataCache.practice) {
                dataSource = lessonDataCache.practice;
            } else if (currentLesson.practice) {
                dataSource = currentLesson.practice;
            } else {
                fetch(`docs/course/${currentLevel}/practice/practice_${paddedId}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            lessonDataCache.practice = data;
                            currentLesson.practice = data;
                            updateCounter();
                        }
                    })
                    .catch(() => {});
                dataSource = [];
            }
            count = dataSource?.length || 0;
            label = 'упражнений';
            break;
            
        case 'quiz':
            if (lessonDataCache.quiz) {
                dataSource = lessonDataCache.quiz?.words || lessonDataCache.quiz;
            } else if (currentLesson.quiz) {
                dataSource = currentLesson.quiz?.words || currentLesson.quiz;
            } else {
                fetch(`docs/course/${currentLevel}/quiz/quiz_${paddedId}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            lessonDataCache.quiz = data;
                            currentLesson.quiz = data;
                            updateCounter();
                        }
                    })
                    .catch(() => {});
                dataSource = [];
            }
            // Если dataSource — объект с полем words, берём words
            if (dataSource && dataSource.words) {
                dataSource = dataSource.words;
            }
            count = dataSource?.length || 0;
            label = 'слов';
            break;
            
        case 'trainer':
            if (lessonDataCache.trainer) {
                dataSource = lessonDataCache.trainer?.templates || lessonDataCache.trainer;
            } else if (currentLesson.trainer) {
                dataSource = currentLesson.trainer?.templates || currentLesson.trainer;
            } else {
                fetch(`docs/course/${currentLevel}/trainer/trainer_${paddedId}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            lessonDataCache.trainer = data;
                            currentLesson.trainer = data;
                            updateCounter();
                        }
                    })
                    .catch(() => {});
                dataSource = [];
            }
            // Если dataSource — объект с полем templates, берём templates
            if (dataSource && dataSource.templates) {
                dataSource = dataSource.templates;
            }
            count = dataSource?.length || 0;
            label = 'фраз';
            break;
            
        case 'dictation':
            if (lessonDataCache.dictation) {
                dataSource = lessonDataCache.dictation;
            } else if (currentLesson.dictation) {
                dataSource = currentLesson.dictation;
            } else {
                fetch(`docs/course/${currentLevel}/dictation/dictation_${paddedId}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data) {
                            lessonDataCache.dictation = data;
                            currentLesson.dictation = data;
                            updateCounter();
                        }
                    })
                    .catch(() => {});
                dataSource = [];
            }
            count = dataSource?.length || 0;
            label = 'предложений';
            break;
            
        default:
            dataSource = currentLesson.vocabulary || [];
            count = dataSource.length || 0;
            label = 'слов';
    }
    
    el.textContent = `${count} ${label}`;
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
    saveState();

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
    saveState();

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <button class="back-btn" onclick="renderLevel()">← К СПИСКУ УРОКОВ</button>
            <div id="modeHeaderControls"></div>
        </div>
        <h2>📖 Урок ${lesson.id}: ${lesson.title}</h2>
        <div class="mode-buttons">
            <button class="mode-btn active" data-mode="grammar">📘 Грамматика</button>
            <button class="mode-btn" data-mode="practice">✍️ Практика</button>
            <button class="mode-btn" data-mode="vocabulary">📚 Лексика</button>
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
            const mode = this.getAttribute('data-mode');
            currentMode = mode;
            saveState();
            renderMode(mode, lesson);
            // Обновляем счетчик после переключения
            setTimeout(updateCounter, 100);
        };
    });

    // ВОССТАНОВЛЕНИЕ РЕЖИМА
    if (!isRestoring) {
        const savedState = loadState();
        if (savedState && savedState.mode && savedState.lessonId === lesson.id) {
            console.log('🔄 Восстановление режима:', savedState.mode);
            const modeBtn = document.querySelector(`.mode-btn[data-mode="${savedState.mode}"]`);
            if (modeBtn) {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                modeBtn.classList.add('active');
                currentMode = savedState.mode;
                renderMode(savedState.mode, lesson);
                setTimeout(updateCounter, 100);
                return;
            }
        }
    }

    renderMode('grammar', lesson);
}

// ========== ОТОБРАЖЕНИЕ РЕЖИМОВ ==========
function renderMode(mode, lesson) {
    const container = document.getElementById('modeContent');
    if (!container) return;

    window.currentLesson = lesson;

    const headerControls = document.getElementById('modeHeaderControls');
    if (headerControls) {
        headerControls.innerHTML = '';
    }

    switch(mode) {
        case 'grammar':
            if (typeof renderGrammar === 'function') {
                renderGrammar(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Грамматика" загружается...</div>';
            }
            break;
        case 'practice':
            if (typeof renderPractice === 'function') {
                renderPractice(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Практика" загружается...</div>';
            }
            break;
        case 'vocabulary':
            if (typeof renderVocabulary === 'function') {
                renderVocabulary(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Лексика" загружается...</div>';
            }
            break;
        case 'quiz':
            if (typeof renderQuiz === 'function') {
                renderQuiz(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Тренировка" загружается...</div>';
            }
            break;
        case 'trainer':
            if (typeof renderTrainer === 'function') {
                renderTrainer(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Тренажёр" загружается...</div>';
            }
            break;
        case 'dictation':
            if (typeof renderDictation === 'function') {
                renderDictation(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Диктант" загружается...</div>';
            }
            break;
        default:
            container.innerHTML = '<div>Режим не найден</div>';
    }
    
    // Обновляем счетчик после загрузки режима
    setTimeout(updateCounter, 200);
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
    
    const savedState = loadState();
    
    if (savedState && savedState.level) {
        console.log('🔄 Восстановление состояния:', savedState);
        currentLevel = savedState.level;
        
        document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
            if (btn.getAttribute('data-level') === currentLevel) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        loadLevel(currentLevel);
        
        if (savedState.lessonId !== null && savedState.lessonId !== undefined) {
            setTimeout(() => {
                if (courseData && courseData.lessons) {
                    const lessonExists = courseData.lessons.some(l => l.id === savedState.lessonId);
                    if (lessonExists) {
                        console.log('🔄 Загрузка сохранённого урока:', savedState.lessonId);
                        if (savedState.mode) {
                            currentMode = savedState.mode;
                        }
                        loadLesson(savedState.lessonId);
                    } else if (courseData.lessons.length > 0) {
                        console.log('⚠️ Сохранённый урок не найден, загружаем первый');
                        loadLesson(courseData.lessons[0].id);
                    }
                }
            }, 150);
        } else {
            console.log('📂 На главной странице');
            setTimeout(() => {
                if (courseData && !currentLesson) {
                    renderLevel();
                }
            }, 200);
        }
    } else {
        console.log('📂 Состояния нет, загружаем A1 по умолчанию');
        loadLevel('A1');
    }
    
    // Принудительное обновление счетчика через 1 секунду
    setTimeout(updateCounter, 1000);
    setTimeout(updateCounter, 2000);
    
    console.log('✅ Deutsch-Meister готов!');
}

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
