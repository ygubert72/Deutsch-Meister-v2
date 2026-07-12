// ====================================================================
// app.js — ГЛАВНЫЙ ФАЙЛ (навигация, загрузка, отрисовка)
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';.
let currentLesson = null;
let courseData = null;
let isRestoring = false;
let isWelcomePageVisible = true;

// ========== ЗАГРУЗКА УРОВНЯ ==========
async function loadLevel(level) {
    if (typeof window.hasAccessToLevel === 'function') {
        if (!window.hasAccessToLevel(level)) {
            const user = window.getCurrentUser ? window.getCurrentUser() : null;
            let message = '🔒 Этот уровень недоступен.';
            if (!user) {
                message += '\n\n👤 Войдите в аккаунт.';
                if (level === 'B1' || level === 'B2' || level === 'C1') {
                    message += ' Для уровней B1-C1 также нужен премиум-доступ.';
                }
            } else if (level === 'A2') {
                message += '\n\n🔐 Для уровня A2 нужна регистрация.';
            } else if (level === 'B1' || level === 'B2' || level === 'C1') {
                const userData = window.getCurrentUserData ? window.getCurrentUserData() : null;
                if (!userData || !userData.hasPremiumAccess) {
                    message += '\n\n💎 Для уровня ' + level + ' требуется премиум-доступ. Нажмите "Оплатить премиум" в профиле.';
                } else {
                    message += '\n\n⛔ Доступ запрещён.';
                }
            }
            alert(message);
            
            if (level === 'A1') return;
            if (window.hasAccessToLevel('A1')) {
                currentLevel = 'A1';
                document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
                    if (btn.getAttribute('data-level') === 'A1') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                loadLevel('A1');
            }
            return;
        }
    }
    
    currentLevel = level;
    isWelcomePageVisible = false;
    console.log('📚 Загрузка уровня:', level);
    try {
        const response = await fetch(`docs/${level}/index.json`);
        if (!response.ok) throw new Error('Курс не найден');
        courseData = await response.json();
        console.log('✅ Курс загружен:', courseData.title);
        renderLevel();
        if (typeof window.saveState === 'function') {
            window.saveState();
        }
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
        
        try {
            const grammarFile = `docs/${currentLevel}/grammar/${String(lessonId).padStart(2, '0')}_grammar.json`;
            console.log('📂 Загрузка грамматики:', grammarFile);
            const grammarResponse = await fetch(grammarFile);
            if (grammarResponse.ok) {
                const grammarData = await grammarResponse.json();
                lesson.grammar = grammarData.theory || grammarData.grammar || '';
                lesson.examples = grammarData.examples || [];
                lesson.vocabulary = grammarData.vocabulary || [];
                lesson.practice = grammarData.practice || [];
                console.log('✅ Грамматика + лексика + упражнения загружены');
            } else {
                console.log('ℹ️ Файл грамматики не найден:', grammarFile);
                lesson.grammar = '<div style="text-align:center;padding:40px;color:#999;">📭 Грамматика не загружена</div>';
                lesson.vocabulary = [];
                lesson.practice = [];
            }
        } catch(e) {
            console.log('ℹ️ Ошибка загрузки грамматики:', e.message);
            lesson.grammar = '<div style="text-align:center;padding:40px;color:#999;">📭 Грамматика не загружена</div>';
            lesson.vocabulary = [];
            lesson.practice = [];
        }
        
        try {
            const lessonFile = `docs/${currentLevel}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            console.log('📂 Загрузка тренировок:', lessonFile);
            const lessonResponse = await fetch(lessonFile);
            if (lessonResponse.ok) {
                const lessonData = await lessonResponse.json();
                lesson.quiz = lessonData.quiz || [];
                lesson.trainer = lessonData.trainer || [];
                lesson.dictation = lessonData.dictation || [];
                console.log('✅ Тест, тренажёр, диктант загружены');
            } else {
                console.log('ℹ️ Файл тренировок не найден:', lessonFile);
                lesson.quiz = [];
                lesson.trainer = [];
                lesson.dictation = [];
            }
        } catch(e) {
            console.log('ℹ️ Ошибка загрузки тренировок:', e.message);
            lesson.quiz = [];
            lesson.trainer = [];
            lesson.dictation = [];
        }
        
        if (!lesson.grammar && lesson.vocabulary.length === 0 && lesson.practice.length === 0 && lesson.quiz.length === 0 && lesson.trainer.length === 0 && lesson.dictation.length === 0) {
            throw new Error('Не удалось загрузить данные урока');
        }
        
        console.log('✅ Урок загружен полностью:', lesson.title);
        currentLesson = lesson;
        isWelcomePageVisible = false;
        renderLesson(lesson);
        if (typeof window.saveState === 'function') {
            window.saveState();
        }
        
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
    
    if (isWelcomePageVisible) {
        el.textContent = '🏠';
        el.style.display = 'inline';
        return;
    }
    
    const activeMode = window.currentMode || 'grammar';
    
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
        case 'listening':
            if (window.listeningData && window.listeningData.dialogs) {
                count = window.listeningData.dialogs.length;
                label = 'диалогов';
            } else {
                el.textContent = '🎧 Аудирование';
                return;
            }
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
            <button class="lesson-btn" data-lesson-id="${lesson.id}" style="transition: all 0.08s ease;">
                📘 Урок ${lesson.id}: ${lesson.title}
            </button>
        `;
    });
    html += `</div>`;
    document.getElementById('content').innerHTML = html;
    document.getElementById('modeIndicator').textContent = `Курс ${currentLevel}`;
    updateCounter();
    if (typeof window.saveState === 'function') {
        window.saveState();
    }

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
    isWelcomePageVisible = false;
    if (typeof window.saveState === 'function') {
        window.saveState();
    }

    const lessonId = lesson.id || 1;
    const level = lesson.level || 'A1';
    const hoerenPath = `docs/${level}/hoeren/${String(lessonId).padStart(2, '0')}_hoeren.json`;
    
    buildLessonHTML(lesson, false);
    
    fetch(hoerenPath, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                const listeningBtn = document.querySelector('.mode-btn[data-mode="listening"]');
                if (!listeningBtn) {
                    buildLessonHTML(lesson, true);
                } else {
                    listeningBtn.style.display = 'inline-block';
                }
            }
        })
        .catch(() => {});
}

function buildLessonHTML(lesson, hasListening) {
    const listeningButtonHtml = hasListening 
        ? `<button class="mode-btn" data-mode="listening">🎧 Аудирование</button>` 
        : '';

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <button class="back-btn" onclick="renderLevel()" style="transition: all 0.08s ease;">← К СПИСКУ УРОКОВ</button>
            <div id="modeHeaderControls"></div>
        </div>
        <h2>📖 Урок ${lesson.id}: ${lesson.title}</h2>
        <div class="mode-buttons">
            <button class="mode-btn active" data-mode="grammar" style="transition: all 0.08s ease;">📘 Грамматика</button>
            <button class="mode-btn" data-mode="quiz" style="transition: all 0.08s ease;">🎯 Тест</button>
            <button class="mode-btn" data-mode="trainer" style="transition: all 0.08s ease;">🧩 Тренажер</button>
            <button class="mode-btn" data-mode="dictation" style="transition: all 0.08s ease;">✏️ Диктант</button>
            ${listeningButtonHtml}
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
            window.currentMode = mode;
            if (typeof window.saveState === 'function') {
                window.saveState();
            }
            renderMode(mode, lesson);
            setTimeout(updateCounter, 50);
        };
    });

    if (!isRestoring) {
        const savedState = typeof window.loadState === 'function' ? window.loadState() : null;
        if (savedState && savedState.mode && savedState.lessonId === lesson.id) {
            const modeBtn = document.querySelector(`.mode-btn[data-mode="${savedState.mode}"]`);
            if (modeBtn) {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                modeBtn.classList.add('active');
                window.currentMode = savedState.mode;
                renderMode(savedState.mode, lesson);
                setTimeout(updateCounter, 50);
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
        case 'listening':
            if (typeof renderListening === 'function') {
                renderListening(container, lesson);
            } else {
                container.innerHTML = '<div>Режим "Аудирование" загружается...</div>';
            }
            break;
        default:
            container.innerHTML = '<div>Режим не найден</div>';
    }
    
    setTimeout(updateCounter, 100);
}

// ========== ОБНОВЛЕНИЕ ПРИВЕТСТВЕННОЙ СТРАНИЦЫ (ИЗВНЕ) ==========
window.updateWelcomePage = function() {
    if (isWelcomePageVisible) {
        if (typeof window.showWelcomePage === 'function') {
            window.showWelcomePage();
        }
    }
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 100);
    }
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initApp() {
    console.log('🚀 Запуск Deutsch-Meister...');
    
    // Снимаем выделение со всех кнопок уровней при загрузке
    document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('#levelsContainer .btn-level').forEach(btn => {
        btn.onclick = function() {
            const level = this.getAttribute('data-level');
            
            if (typeof window.hasAccessToLevel === 'function') {
                if (!window.hasAccessToLevel(level)) {
                    const user = window.getCurrentUser ? window.getCurrentUser() : null;
                    let message = '🔒 Этот уровень недоступен.';
                    if (!user) {
                        message += '\n\n👤 Войдите в аккаунт.';
                        if (level === 'B1' || level === 'B2' || level === 'C1') {
                            message += ' Для уровней B1-C1 также нужен премиум-доступ.';
                        }
                    } else if (level === 'A2') {
                        message += '\n\n🔐 Для уровня A2 нужна регистрация.';
                    } else if (level === 'B1' || level === 'B2' || level === 'C1') {
                        const userData = window.getCurrentUserData ? window.getCurrentUserData() : null;
                        if (!userData || !userData.hasPremiumAccess) {
                            message += '\n\n💎 Для уровня ' + level + ' требуется премиум-доступ. Нажмите "Оплатить премиум" в профиле.';
                        } else {
                            message += '\n\n⛔ Доступ запрещён.';
                        }
                    }
                    alert(message);
                    return;
                }
            }
            
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => {
                if (b.getAttribute('data-level') === level) {
                    b.classList.add('active');
                }
            });
            currentLevel = level;
            isWelcomePageVisible = false;
            loadLevel(currentLevel);
        };
    });
    
    document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(btn => {
        btn.onclick = function() {
            const level = this.getAttribute('data-level');
            
            if (typeof window.hasAccessToLevel === 'function') {
                if (!window.hasAccessToLevel(level)) {
                    const user = window.getCurrentUser ? window.getCurrentUser() : null;
                    let message = '🔒 Этот уровень недоступен.';
                    if (!user) {
                        message += '\n\n👤 Войдите в аккаунт.';
                        if (level === 'B1' || level === 'B2' || level === 'C1') {
                            message += ' Для уровней B1-C1 также нужен премиум-доступ.';
                        }
                    } else if (level === 'A2') {
                        message += '\n\n🔐 Для уровня A2 нужна регистрация.';
                    } else if (level === 'B1' || level === 'B2' || level === 'C1') {
                        const userData = window.getCurrentUserData ? window.getCurrentUserData() : null;
                        if (!userData || !userData.hasPremiumAccess) {
                            message += '\n\n💎 Для уровня ' + level + ' требуется премиум-доступ. Нажмите "Оплатить премиум" в профиле.';
                        } else {
                            message += '\n\n⛔ Доступ запрещён.';
                        }
                    }
                    alert(message);
                    return;
                }
            }
            
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => {
                if (b.getAttribute('data-level') === level) {
                    b.classList.add('active');
                }
            });
            currentLevel = level;
            isWelcomePageVisible = false;
            loadLevel(currentLevel);
        };
    });
    
    const savedState = typeof window.loadState === 'function' ? window.loadState() : null;
    
    if (savedState && savedState.level && savedState.lessonId !== null && savedState.lessonId !== undefined) {
        if (typeof window.hasAccessToLevel === 'function' && !window.hasAccessToLevel(savedState.level)) {
            console.log('⚠️ Сохранённый уровень недоступен, показываем приветственную');
            if (typeof window.showWelcomePage === 'function') {
                window.showWelcomePage();
            }
            return;
        }
        
        setTimeout(() => {
            if (courseData && courseData.lessons) {
                const lessonExists = courseData.lessons.some(l => l.id === savedState.lessonId);
                if (lessonExists && window.hasAccessToLevel(savedState.level)) {
                    console.log('🔄 Восстановление сохранённого урока:', savedState.lessonId);
                    currentLevel = savedState.level;
                    isWelcomePageVisible = false;
                    if (savedState.mode) {
                        window.currentMode = savedState.mode;
                    }
                    document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
                        if (btn.getAttribute('data-level') === savedState.level) {
                            btn.classList.add('active');
                        }
                    });
                    loadLesson(savedState.lessonId);
                    return;
                }
            }
            if (typeof window.showWelcomePage === 'function') {
                window.showWelcomePage();
            }
        }, 300);
    } else {
        if (typeof window.showWelcomePage === 'function') {
            window.showWelcomePage();
        }
    }
    
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 200);
    }
    
    setTimeout(updateCounter, 1000);
    setTimeout(updateCounter, 2000);
    
    console.log('✅ Deutsch-Meister готов!');
}

// ========== ЭКСПОРТ В ГЛОБАЛЬНЫЙ ОБЪЕКТ ==========
window.currentLevel = currentLevel;
window.currentLesson = currentLesson;
window.courseData = courseData;
window.isWelcomePageVisible = isWelcomePageVisible;
window.loadLevel = loadLevel;
window.loadLesson = loadLesson;
window.renderLevel = renderLevel;
window.renderLesson = renderLesson;
window.renderMode = renderMode;
window.updateCounter = updateCounter;
window.initApp = initApp;

console.log('🚀 app.js загружен');
