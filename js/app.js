// ====================================================================
// app.js — ГЛАВНЫЙ ФАЙЛ (навигация, загрузка, инициализация)
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let courseData = null;

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

// ========== ОТОБРАЖЕНИЕ РЕЖИМОВ (вызов функций из отдельных файлов) ==========
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
