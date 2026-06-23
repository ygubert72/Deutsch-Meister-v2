// ====================================================================
// app.js — ЛОГИКА ПРИЛОЖЕНИЯ (данные из JSON)
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
            <button class="mode-btn" data-mode="vocabulary">📚 Слова</button>
            <button class="mode-btn" data-mode="practice">✍️ Практика</button>
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
        case 'dictation':
            renderDictation(container, lesson);
            break;
        default:
            container.innerHTML = '<div>Режим не найден</div>';
    }
}

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

function renderPractice(container, lesson) {
    const exercises = lesson.practice || [];
    if (exercises.length === 0) {
        container.innerHTML = '<div>Упражнений нет</div>';
        return;
    }

    let html = '<h3>✍️ Упражнения</h3>';
    exercises.forEach((ex, index) => {
        html += `
            <div class="practice-item">
                <div><strong>${index + 1}.</strong> ${ex.question}</div>
                <div style="margin: 8px 0;">${ex.sentence}</div>
                <input type="text" class="practice-input" data-index="${index}" placeholder="Введите ответ...">
                <button class="check-btn" data-index="${index}">ПРОВЕРИТЬ</button>
                <div class="practice-result" data-index="${index}"></div>
                <div style="color: #999; font-size: 14px;">💡 ${ex.hint}</div>
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
            } else {
                result.innerHTML = `❌ Неправильно. Правильный ответ: <strong>${exercise.answer}</strong>`;
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
            }
        };
    });
}

function renderDictation(container, lesson) {
    const sentences = lesson.dictation || [];
    if (sentences.length === 0) {
        container.innerHTML = '<div>Нет предложений для диктанта</div>';
        return;
    }

    let html = '<h3>✏️ Правописание</h3><p>Напишите перевод на немецком языке:</p>';
    sentences.forEach((s, index) => {
        html += `
            <div class="dictation-item">
                <div><strong>${index + 1}.</strong> ${s.ru}</div>
                <input type="text" class="practice-input" data-dict-index="${index}" placeholder="Введите перевод...">
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
            } else {
                result.innerHTML = `❌ Неправильно. Правильный ответ: <strong>${sentence.de}</strong>`;
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
            }
        };
    });
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
    
    // Загружаем A1
    loadLevel('A1');
    
    console.log('✅ Deutsch-Meister готов!');
}

// Запуск
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
