// ====================================================================
// app.js — ГЛАВНЫЙ ФАЙЛ (навигация, загрузка, сохранение состояния)
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let courseData = null;
let isRestoring = false;

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
        const response = await fetch(`docs/${level}/index.json`);
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
        
        let lesson = {
            id: lessonId,
            title: lessonInfo.title,
            level: currentLevel
        };
        
        // 1. Загружаем ГРАММАТИКУ из папки grammar/
        try {
            const grammarFile = `docs/${currentLevel}/grammar/${lessonInfo.file}`;
            console.log('📂 Загрузка грамматики:', grammarFile);
            const grammarResponse = await fetch(grammarFile);
            if (grammarResponse.ok) {
                const grammarData = await grammarResponse.json();
                lesson.grammar = grammarData.grammar || '';
                lesson.examples = grammarData.examples || [];
                console.log('✅ Грамматика загружена');
            } else {
                console.log('ℹ️ Файл грамматики не найден:', grammarFile);
            }
        } catch(e) {
            console.log('ℹ️ Ошибка загрузки грамматики:', e.message);
        }
        
        // 2. Загружаем ВСЁ ОСТАЛЬНОЕ из папки lessons/
        try {
            const lessonFile = `docs/${currentLevel}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            console.log('📂 Загрузка урока:', lessonFile);
            const lessonResponse = await fetch(lessonFile);
            if (lessonResponse.ok) {
                const lessonData = await lessonResponse.json();
                lesson.vocabulary = lessonData.vocabulary || [];
                lesson.practice = lessonData.practice || [];
                lesson.quiz = lessonData.quiz || [];
                lesson.trainer = lessonData.trainer || [];
                lesson.dictation = lessonData.dictation || [];
                console.log('✅ Урок загружен (vocabulary, practice, quiz, trainer, dictation)');
            } else {
                console.log('ℹ️ Файл урока не найден:', lessonFile);
            }
        } catch(e) {
            console.log('ℹ️ Ошибка загрузки урока:', e.message);
        }
        
        if (!lesson.grammar && !lesson.vocabulary && !lesson.practice && !lesson.quiz && !lesson.trainer && !lesson.dictation) {
            throw new Error('Не удалось загрузить данные урока');
        }
        
        console.log('✅ Урок загружен:', lesson.title);
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

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА ==========
function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    
    const activeMode = currentMode || 'grammar';
    
    if (activeMode === 'grammar') {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    
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
    
    switch(activeMode) {
        case 'vocabulary':
            count = currentLesson.vocabulary?.length || 0;
            label = 'слов';
            break;
        case 'practice':
            count = currentLesson.practice?.length || 0;
            label = 'упражнений';
            break;
        case 'quiz':
            const quizData = currentLesson.quiz;
            if (quizData && quizData.words) {
                count = quizData.words.length;
            } else if (Array.isArray(quizData)) {
                count = quizData.length;
            } else {
                count = 0;
            }
            label = 'слов';
            break;
        case 'trainer':
            const trainerData = currentLesson.trainer;
            if (trainerData && trainerData.templates) {
                count = trainerData.templates.length;
            } else if (Array.isArray(trainerData)) {
                count = trainerData.length;
            } else {
                count = 0;
            }
            label = 'фраз';
            break;
        case 'dictation':
            count = currentLesson.dictation?.length || 0;
            label = 'предложений';
            break;
        default:
            count = 0;
            label = '';
    }
    
    el.textContent = count > 0 ? `${count} ${label}` : '';
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
            <button class="mode-btn" data-mode="practice">✍️ Упражнения</button>
            <button class="mode-btn" data-mode="vocabulary">📚 Словарь</button>
            <button class="mode-btn" data-mode="quiz">🎯 Тест</button>
            <button class="mode-btn" data-mode="trainer">🧩 Тренажер</button>
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
                container.innerHTML = '<div>Режим "Тест" загружается...</div>';
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
    
    setTimeout(updateCounter, 1000);
    setTimeout(updateCounter, 2000);
    
    console.log('✅ Deutsch-Meister готов!');
}

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
