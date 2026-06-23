// ====================================================================
// app.js — ГЛАВНЫЙ ФАЙЛ (навигация, загрузка, сохранение состояния)
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let courseData = null;
// currentMode объявлен в config.js

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
            console.log('📂 Состояние загружено:', state);
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

async function loadLesson(lessonId) {
    console.log('📖 Загрузка урока:', lessonId);
    try {
        const lessonInfo = courseData.lessons.find(l => l.id === lessonId);
        if (!lessonInfo) throw new Error('Урок не найден');
        
        const response = await fetch(`docs/course/${currentLevel}/lessons/${lessonInfo.file}`);
        if (!response.ok) throw new Error('Файл урока не найден');
        const lesson = await response.json();
        console.log('✅ Урок загружен:', lesson.title);
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
            const mode = this.getAttribute('data-mode');
            currentMode = mode;
            saveState();
            renderMode(mode, lesson);
        };
    });

    // Восстанавливаем сохранённый режим, если он был
    const savedState = loadState();
    if (savedState && savedState.mode && savedState.lessonId === lesson.id) {
        const modeBtn = document.querySelector(`.mode-btn[data-mode="${savedState.mode}"]`);
        if (modeBtn) {
            console.log('🔄 Восстановление режима:', savedState.mode);
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            modeBtn.classList.add('active');
            currentMode = savedState.mode;
            renderMode(savedState.mode, lesson);
            return;
        }
    }

    renderMode('grammar', lesson);
}

// ========== ОТОБРАЖЕНИЕ РЕЖИМОВ ==========
function renderMode(mode, lesson) {
    const container = document.getElementById('modeContent');
    if (!container) return;

    window.currentLesson = lesson;

    switch(mode) {
        case 'grammar':
            if (typeof renderGrammar === 'function') {
                renderGrammar(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Грамматика" загружается...</div>';
            }
            break;
        case 'vocabulary':
            if (typeof renderVocabulary === 'function') {
                renderVocabulary(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Лексика" загружается...</div>';
            }
            break;
        case 'practice':
            if (typeof renderPractice === 'function') {
                renderPractice(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Практика" загружается...</div>';
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
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initApp() {
    console.log('🚀 Запуск Deutsch-Meister...');
    
    // Кнопки уровней (десктоп)
    document.querySelectorAll('#levelsContainer .btn-level').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentLevel = this.getAttribute('data-level');
            loadLevel(currentLevel);
        };
    });
    
    // Кнопки уровней (мобильные)
    document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentLevel = this.getAttribute('data-level');
            loadLevel(currentLevel);
        };
    });
    
    // ==== ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ====
    const savedState = loadState();
    if (savedState) {
        console.log('🔄 Восстановление состояния:', savedState);
        currentLevel = savedState.level || 'A1';
        
        // Активируем кнопку уровня
        document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
            if (btn.getAttribute('data-level') === currentLevel) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Загружаем уровень
        loadLevel(currentLevel);
        
        // Если был открыт урок — загружаем его ПОСЛЕ загрузки уровня
        if (savedState.lessonId) {
            // Используем setTimeout с проверкой через интервал
            let attempts = 0;
            const maxAttempts = 20; // 2 секунды (20 * 100ms)
            
            const tryLoadLesson = setInterval(() => {
                attempts++;
                console.log(`⏳ Попытка ${attempts} загрузить урок ${savedState.lessonId}...`);
                
                if (courseData && courseData.lessons) {
                    clearInterval(tryLoadLesson);
                    const lessonExists = courseData.lessons.some(l => l.id === savedState.lessonId);
                    if (lessonExists) {
                        console.log('🔄 Загрузка сохранённого урока:', savedState.lessonId);
                        loadLesson(savedState.lessonId);
                    } else {
                        console.warn('⚠️ Сохранённый урок не найден, загружаем первый');
                        if (courseData.lessons.length > 0) {
                            loadLesson(courseData.lessons[0].id);
                        }
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(tryLoadLesson);
                    console.warn('⚠️ Таймаут загрузки курса, загружаем первый урок');
                    if (courseData && courseData.lessons && courseData.lessons.length > 0) {
                        loadLesson(courseData.lessons[0].id);
                    }
                }
            }, 100);
        }
    } else {
        // Если состояния нет — загружаем A1
        console.log('📂 Состояния нет, загружаем A1 по умолчанию');
        loadLevel('A1');
    }
    
    console.log('✅ Deutsch-Meister готов!');
}

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
