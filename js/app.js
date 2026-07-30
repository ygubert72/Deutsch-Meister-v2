// ====================================================================
// app.js — ГЛАВНЫЙ ФАЙЛ (навигация, загрузка, сохранение состояния)
// ====================================================================

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let courseData = null;
let isRestoring = false;
let isWelcomePageVisible = true;
let appReady = false;
let pendingState = null;
let isLoadingLesson = false;

// ========== КЛЮЧИ ДЛЯ ХРАНЕНИЯ ==========
const FIRST_LAUNCH_KEY = 'dm_first_launch';
const APP_STATE_KEY = 'dm_app_state';
const CACHE_KEY = 'dm_lesson_cache';

// ========== СОХРАНЕНИЕ СОСТОЯНИЯ ==========
function saveState() {
    try {
        const state = {
            level: currentLevel,
            lessonId: currentLesson?.id || null,
            mode: typeof currentMode !== 'undefined' ? currentMode : 'grammar',
            timestamp: Date.now()
        };
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
        return state;
    } catch(e) {
        return null;
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(APP_STATE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch(e) {}
    return null;
}

function isFirstLaunch() {
    const firstLaunch = localStorage.getItem(FIRST_LAUNCH_KEY);
    if (firstLaunch === null) {
        localStorage.setItem(FIRST_LAUNCH_KEY, 'false');
        return true;
    }
    return false;
}

function clearAppState() {
    localStorage.removeItem(APP_STATE_KEY);
}

// ========== КЕШИРОВАНИЕ УРОКОВ (С ВЕРСИОНИРОВАНИЕМ) ==========
function cacheLesson(level, lessonId, lessonData) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        if (!cache[level]) cache[level] = {};
        cache[level][lessonId] = {
            data: lessonData,
            timestamp: Date.now(),
            version: '1.0',
            contentVersion: window.getContentVersion ? window.getContentVersion() : '1.0'
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
}

function getCachedLesson(level, lessonId) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        if (cache[level] && cache[level][lessonId]) {
            const cached = cache[level][lessonId];
            // Проверяем версию контента
            const currentVersion = window.getContentVersion ? window.getContentVersion() : '1.0';
            // Если версия не совпадает — удаляем устаревший кеш
            if (cached.contentVersion !== currentVersion) {
                delete cache[level][lessonId];
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                return null;
            }
            // Проверяем срок годности (7 дней)
            const isExpired = (Date.now() - cached.timestamp) > 7 * 24 * 60 * 60 * 1000;
            if (!isExpired) {
                return cached.data;
            }
            // Если просрочен — удаляем
            delete cache[level][lessonId];
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
    } catch(e) {}
    return null;
}

function clearLessonCache() {
    localStorage.removeItem(CACHE_KEY);
}

function clearLevelCache(level) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        delete cache[level];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
}

// ========== ПОКАЗАТЬ ПРИВЕТСТВЕННУЮ СТРАНИЦУ ==========
function showWelcomePage() {
    isWelcomePageVisible = true;
    currentLevel = 'A1';
    currentLesson = null;
    courseData = null;
    
    const content = document.getElementById('content');
    const indicator = document.getElementById('modeIndicator');
    const counter = document.getElementById('counter');
    
    indicator.textContent = '🏠 Главная';
    if (counter) counter.textContent = '';
    
    const flagSvg = window.GERMAN_FLAG_SVG || '';
    
    content.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:70vh; text-align:center; padding:20px;">
            <div style="margin-bottom:20px;">
                ${flagSvg}
            </div>
            <h1 style="font-size:42px; color:#1A1A1A; margin:0 0 10px 0;">Deutsch-Meister</h1>
            <p style="font-size:20px; color:#3B6FE0; margin:0 0 5px 0; font-weight:500;">Добро пожаловать в Deutsch-Meister!</p>
            <p style="font-size:18px; color:#1A1A1A; margin:5px 0 20px 0; font-style:italic;">
                Übung macht den Meister — Практика делает мастера.
            </p>
            <p style="font-size:16px; color:#1A1A1A; max-width:550px; margin:0 auto 10px auto; line-height:1.7;">
                Изучайте немецкий язык с нуля до уровня C1 по нашей современной методике.
            </p>
            <p style="font-size:14px; color:#1A1A1A; max-width:550px; margin:0 auto 30px auto; line-height:1.7;">
                Выберите свой уровень в меню слева и начинайте обучение.<br>
                Все уроки содержат грамматику, тесты, тренажёр, диктант и аудирование.
            </p>
            <button onclick="showInstruction()" style="padding:12px 40px; background:linear-gradient(135deg, #3B6FE0, #2B5BC7); color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold; box-shadow:0 4px 15px rgba(59,111,224,0.3); transition:all 0.1s ease;">
                ❓ Инструкция
            </button>
            <div style="margin-top:20px; font-size:13px; color:#1A1A1A;">
                🔒 A1 — доступен всем &nbsp;·&nbsp; A2 — после регистрации &nbsp;·&nbsp; B1-C1 — с премиумом
            </div>
        </div>
    `;
    
    document.getElementById('modeIndicator').textContent = '🏠 Главная';
    
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 100);
    }
    
    document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
        btn.classList.remove('active');
    });
    
    saveState();
}

// ========== ПОКАЗАТЬ ИНСТРУКЦИЮ ==========
function showInstruction() {
    const content = document.getElementById('content');
    const indicator = document.getElementById('modeIndicator');
    const counter = document.getElementById('counter');
    
    const previousPage = isWelcomePageVisible ? 'welcome' : 'level';
    indicator.textContent = '❓ Инструкция';
    if (counter) counter.textContent = '';
    
    content.innerHTML = `
        <div style="max-width:800px; margin:0 auto; padding:20px 15px;">
            <button onclick="window.goBackFromInstruction()" 
                    style="padding:8px 20px; background:#E8F0FE; border:2px solid #D0D0D0; border-radius:8px; cursor:pointer; font-weight:bold; margin-bottom:20px; transition:all 0.08s ease;">
                ← Назад
            </button>
            
            <h1 style="font-size:32px; color:#1A1A1A; margin:0 0 25px 0;">❓ Инструкция</h1>
            
            <div style="background:#f8f9fa; border-radius:12px; padding:20px; margin-bottom:20px;">
                <h3 style="margin:0 0 15px 0; color:#1A1A1A; font-size:18px;">📚 Как пользоваться Deutsch-Meister</h3>
                <ul style="list-style:none; padding:0; margin:0; line-height:2.2; font-size:15px; color:#1A1A1A;">
                    <li><strong>Выберите уровень</strong> — A1, A2, B1, B2 или C1 в меню слева</li>
                    <li><strong>Откройте урок</strong> — нажмите на нужный урок в списке</li>
                    <li><strong>Изучайте грамматику</strong> <span style="font-size:20px;">📘</span> — теория, примеры, словарь и упражнения</li>
                    <li><strong>Тренируйте слова</strong> <span style="font-size:20px;">🎯</span> — режим «Тест» с карточками и контейнером</li>
                    <li><strong>Собирайте фразы</strong> <span style="font-size:20px;">🧩</span> — режим «Тренажёр» из слов</li>
                    <li><strong>Пишите диктанты</strong> <span style="font-size:20px;">✏️</span> — проверяйте правописание</li>
                    <li><strong>Слушайте аудирование</strong> <span style="font-size:20px;">🎧</span> — развивайте навыки восприятия на слух</li>
                    <li><strong>Работайте с карточками</strong> <span style="font-size:20px;">📚</span> — заучивайте все слова уровня</li>
                    <li><strong>Составляйте предложения</strong> <span style="font-size:20px;">🧩</span> — тренируйте все фразы уровня</li>
                </ul>
            </div>
            
            <div style="background:#FFF8E1; border-radius:12px; padding:15px 20px; margin-bottom:15px; border-left:4px solid #FFC107;">
                <p style="margin:0; font-size:14px; color:#1A1A1A;">
                    💡 <strong>Прогресс сохраняется автоматически</strong> — слова и фразы, отмеченные как «Изучено», попадают в контейнер и не повторяются.
                </p>
            </div>
            
            <div style="background:#E8F5E9; border-radius:12px; padding:15px 20px; border-left:4px solid #4CAF50;">
                <p style="margin:0; font-size:14px; color:#1A1A1A;">
                    🔐 <strong>Доступ к уровням:</strong> A1 — доступен всем · A2 — после регистрации · B1-C1 — с премиум-доступом
                </p>
            </div>
        </div>
    `;
    
    window._instructionReturnPage = previousPage;
}

window.goBackFromInstruction = function() {
    if (window._instructionReturnPage === 'welcome' || isWelcomePageVisible) {
        showWelcomePage();
    } else {
        if (currentLesson) {
            renderLesson(currentLesson);
        } else if (courseData) {
            renderLevel();
        } else {
            showWelcomePage();
        }
    }
};

// ========== ЗАГРУЗКА УРОВНЯ ==========
async function loadLevel(level) {
    if (typeof window.hasAccessToLevel === 'function') {
        if (!window.auth) {
            pendingState = { type: 'level', level: level };
            return;
        }
        
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
    appReady = true;
    
    try {
        const response = await fetch(`docs/${level}/index.json`);
        if (!response.ok) throw new Error('Курс не найден');
        courseData = await response.json();
        renderLevel();
        saveState();
    } catch(e) {
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
    if (isLoadingLesson) {
        return;
    }
    
    if (currentLesson && currentLesson.id === lessonId) {
        renderLesson(currentLesson);
        return;
    }
    
    if (typeof window.hasAccessToLevel === 'function') {
        if (!window.auth) {
            pendingState = { type: 'lesson', lessonId: lessonId };
            return;
        }
        if (!window.hasAccessToLevel(currentLevel)) {
            showWelcomePage();
            return;
        }
    }
    
    isLoadingLesson = true;
    
    try {
        const lessonInfo = courseData.lessons.find(l => l.id === lessonId);
        if (!lessonInfo) throw new Error('Урок не найден');
        
        const cachedLesson = getCachedLesson(currentLevel, lessonId);
        let lesson = null;
        
        if (cachedLesson) {
            lesson = cachedLesson;
            lesson.id = lessonId;
            lesson.title = lessonInfo.title;
            lesson.level = currentLevel;
        } else {
            lesson = {
                id: lessonId,
                title: lessonInfo.title,
                level: currentLevel
            };
            
            try {
                const grammarFile = `docs/${currentLevel}/grammar/${String(lessonId).padStart(2, '0')}_grammar.json`;
                const grammarResponse = await fetch(grammarFile);
                if (grammarResponse.ok) {
                    const grammarData = await grammarResponse.json();
                    lesson.grammar = grammarData.theory || grammarData.grammar || '';
                    lesson.examples = grammarData.examples || [];
                    lesson.vocabulary = grammarData.vocabulary || [];
                    lesson.practice = grammarData.practice || [];
                } else {
                    lesson.grammar = '<div style="text-align:center;padding:40px;color:#999;">📭 Грамматика не загружена</div>';
                    lesson.vocabulary = [];
                    lesson.practice = [];
                }
            } catch(e) {
                lesson.grammar = '<div style="text-align:center;padding:40px;color:#999;">📭 Грамматика не загружена</div>';
                lesson.vocabulary = [];
                lesson.practice = [];
            }
            
            try {
                const lessonFile = `docs/${currentLevel}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
                const lessonResponse = await fetch(lessonFile);
                if (lessonResponse.ok) {
                    const lessonData = await lessonResponse.json();
                    lesson.quiz = lessonData.quiz || [];
                    lesson.trainer = lessonData.trainer || [];
                    lesson.dictation = lessonData.dictation || [];
                } else {
                    lesson.quiz = [];
                    lesson.trainer = [];
                    lesson.dictation = [];
                }
            } catch(e) {
                lesson.quiz = [];
                lesson.trainer = [];
                lesson.dictation = [];
            }
            
            if (lesson.grammar || lesson.vocabulary.length > 0 || lesson.quiz.length > 0) {
                cacheLesson(currentLevel, lessonId, lesson);
            }
        }
        
        if (!lesson.grammar && lesson.vocabulary.length === 0 && lesson.practice.length === 0 && lesson.quiz.length === 0 && lesson.trainer.length === 0 && lesson.dictation.length === 0) {
            throw new Error('Не удалось загрузить данные урока');
        }
        
        currentLesson = lesson;
        isWelcomePageVisible = false;
        appReady = true;
        renderLesson(lesson);
        saveState();
        
    } catch(e) {
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                <div>Ошибка загрузки урока.</div>
                <div style="font-size: 14px; margin-top: 10px;">${e.message}</div>
                <button class="back-btn" onclick="renderLevel()" style="margin-top: 15px;">← Назад</button>
            </div>
        `;
    } finally {
        isLoadingLesson = false;
    }
}

// ========== ОБРАБОТЧИК ГОТОВНОСТИ AUTH ==========
function onAuthReady() {
    if (pendingState) {
        const state = pendingState;
        pendingState = null;
        if (state.type === 'level') {
            loadLevel(state.level);
        } else if (state.type === 'lesson') {
            loadLesson(state.lessonId);
        } else if (state.type === 'restore') {
            restoreState();
        }
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
    
    const activeMode = typeof currentMode !== 'undefined' ? currentMode : 'grammar';
    
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

    let totalWords = 0;
    let totalPhrases = 0;
    
    const countWordsInLevel = async function() {
        try {
            const response = await fetch(`docs/${currentLevel}.json`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    return data.length;
                }
            }
            return 0;
        } catch(e) {
            console.log('⚠️ Не удалось загрузить слова уровня');
            return 0;
        }
    };

    const countPhrasesInLevel = async function() {
        let count = 0;
        const seen = new Set();
        for (const lesson of courseData.lessons) {
            const lessonId = lesson.id;
            const lessonFile = `docs/${currentLevel}/lessons/lesson_${String(lessonId).padStart(2, '0')}.json`;
            try {
                const response = await fetch(lessonFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.trainer && Array.isArray(data.trainer)) {
                        for (const phrase of data.trainer) {
                            const key = phrase.de + '|' + phrase.ru;
                            if (!seen.has(key)) {
                                seen.add(key);
                                count++;
                            }
                        }
                    }
                }
            } catch(e) {
                console.log('⚠️ Не удалось загрузить урок', lessonId);
            }
        }
        return count;
    };

    let html = `<h2>📚 ${courseData.title}</h2><div style="margin-top: 20px;">`;
    courseData.lessons.forEach(lesson => {
        html += `
            <button class="lesson-btn" data-lesson-id="${lesson.id}" style="transition: all 0.08s ease;">
                📘 Урок ${lesson.id}: ${lesson.title}
            </button>
        `;
    });
    
    html += `
        <button id="allWordsLevelBtn" class="lesson-btn all-words-btn" style="
            border-color: #D0D0D0; 
            background: #E8F5E9;
            margin-top: 20px;
            font-weight: normal;
            transition: all 0.08s ease;
            border: 2px solid #D0D0D0;
        ">
            📚 ВСЕ СЛОВА УРОВНЯ <span id="wordCountPlaceholder">(загрузка...)</span>
        </button>
        
        <button id="allPhrasesLevelBtn" class="lesson-btn all-words-btn" style="
            border-color: #D0D0D0; 
            background: #FFF8E1;
            margin-top: 10px;
            font-weight: normal;
            transition: all 0.08s ease;
            border: 2px solid #D0D0D0;
        ">
            🧩 ВСЕ ФРАЗЫ УРОВНЯ <span id="phraseCountPlaceholder">(загрузка...)</span>
        </button>
    `;
    html += `</div>`;
    document.getElementById('content').innerHTML = html;
    document.getElementById('modeIndicator').textContent = `Курс ${currentLevel}`;
    updateCounter();
    saveState();

    document.querySelectorAll('.lesson-btn[data-lesson-id]').forEach(btn => {
        btn.onclick = function() {
            const id = parseInt(this.getAttribute('data-lesson-id'));
            loadLesson(id);
        };
    });

    const allWordsBtn = document.getElementById('allWordsLevelBtn');
    if (allWordsBtn) {
        countWordsInLevel().then(count => {
            totalWords = count;
            const placeholder = document.getElementById('wordCountPlaceholder');
            if (placeholder) {
                placeholder.textContent = `(${totalWords} слов)`;
            }
        });

        allWordsBtn.onclick = function() {
            if (typeof window.loadAllWordsMode === 'function') {
                window.loadAllWordsMode(currentLevel);
            } else {
                alert('⚠️ Режим "Все слова" временно недоступен. Пожалуйста, обновите страницу.');
            }
        };
    }

    const allPhrasesBtn = document.getElementById('allPhrasesLevelBtn');
    if (allPhrasesBtn) {
        countPhrasesInLevel().then(count => {
            totalPhrases = count;
            const placeholder = document.getElementById('phraseCountPlaceholder');
            if (placeholder) {
                placeholder.textContent = `(${totalPhrases} фраз)`;
            }
        });

        allPhrasesBtn.onclick = function() {
            if (typeof window.loadAllPhrasesMode === 'function') {
                window.loadAllPhrasesMode(currentLevel);
            } else {
                alert('⚠️ Режим "Все фразы" временно недоступен. Пожалуйста, обновите страницу.');
            }
        };
    }
}

// ========== ОТОБРАЖЕНИЕ УРОКА ==========
// ========== ОТОБРАЖЕНИЕ УРОКА ==========
function renderLesson(lesson) {
    currentLesson = lesson;
    isWelcomePageVisible = false;
    saveState();

    // Сначала рисуем урок без кнопки аудирования
    buildLessonHTML(lesson, true);
    
    const lessonId = lesson.id || 1;
    const level = lesson.level || 'A1';
    const hoerenPath = `docs/${level}/hoeren/${String(lessonId).padStart(2, '0')}_hoeren.json`;
    
    // Проверяем существование файла аудирования через HEAD запрос
    fetch(hoerenPath, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                // Файл существует — добавляем кнопку "Аудирование"
                const listeningBtn = document.querySelector('.mode-btn[data-mode="listening"]');
                if (!listeningBtn) {
                    // Если кнопки нет — создаём её
                    const modeButtons = document.querySelector('.mode-buttons');
                    if (modeButtons) {
                        const btn = document.createElement('button');
                        btn.className = 'mode-btn';
                        btn.setAttribute('data-mode', 'listening');
                        btn.textContent = '🎧 Аудирование';
                        btn.style.transition = 'all 0.08s ease';
                        
                        // Добавляем обработчик клика
                        btn.onclick = function() {
                            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                            this.classList.add('active');
                            const mode = this.getAttribute('data-mode');
                            window.currentMode = mode;
                            currentMode = mode;
                            saveState();
                            renderMode(mode, lesson);
                            setTimeout(updateCounter, 50);
                        };
                        
                        modeButtons.appendChild(btn);
                        console.log('✅ Кнопка "Аудирование" добавлена!');
                    }
                } else {
                    // Если кнопка уже есть — просто показываем её
                    listeningBtn.style.display = 'inline-block';
                }
            }
        })
        .catch(() => {
            // Ошибка (нет интернета и т.д.) — игнорируем
        });
}

function buildLessonHTML(lesson, hasListening) {
    const listeningButtonHtml = hasListening 
        ? `<button class="mode-btn" data-mode="listening">🎧 Аудирование</button>` 
        : '';

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <button class="back-btn" onclick="renderLevel()" style="transition: all 0.08s ease;">← НАЗАД</button>
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
        currentMode = mode;
        saveState();
        saveProgress();  // ← ДОБАВЛЯЕМ ЭТУ СТРОКУ!
        renderMode(mode, lesson);
        setTimeout(updateCounter, 50);
    };
});

    if (!isRestoring) {
        const savedState = loadState();
        if (savedState && savedState.mode && savedState.lessonId === lesson.id) {
            const modeBtn = document.querySelector(`.mode-btn[data-mode="${savedState.mode}"]`);
            if (modeBtn) {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                modeBtn.classList.add('active');
                if (typeof currentMode !== 'undefined') {
                    window.currentMode = savedState.mode;
                }
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

// ========== ОБНОВЛЕНИЕ ПРИВЕТСТВЕННОЙ СТРАНИЦЫ ==========
window.updateWelcomePage = function() {
    if (isWelcomePageVisible) {
        showWelcomePage();
    }
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 100);
    }
};

// ========== ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ==========
function restoreState() {
    const savedState = loadState();
    
    // ===== ИЗМЕНЕНО: сначала восстанавливаем режим из сохранённого состояния =====
    // Используем savedState.mode (из dm_app_state) с приоритетом
    if (savedState && savedState.mode) {
        window.currentMode = savedState.mode;
    } else if (window._savedMode) {
        // Если в dm_app_state нет mode, используем сохранённый из dm_config
        window.currentMode = window._savedMode;
    }
    // ===== КОНЕЦ ИЗМЕНЕНИЙ =====
    
    if (savedState && savedState.level) {
        currentLevel = savedState.level;
        isWelcomePageVisible = false;
        
        // ===== УДАЛЕНО: дублирующая установка currentMode (убрали старые строки) =====
        // if (savedState.mode && typeof currentMode !== 'undefined') {
        //     window.currentMode = savedState.mode;
        // }
        // ===== КОНЕЦ УДАЛЕНИЯ =====
        
        document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
            if (btn.getAttribute('data-level') === savedState.level) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        fetch(`docs/${savedState.level}/index.json`)
            .then(response => {
                if (!response.ok) throw new Error('Курс не найден');
                return response.json();
            })
            .then(data => {
                courseData = data;
                
                // ===== ИСПРАВЛЕНО: если lessonId === null — показываем список уроков =====
                if (savedState.lessonId !== null && savedState.lessonId !== undefined) {
                    const lessonExists = courseData.lessons.some(l => l.id === savedState.lessonId);
                    if (lessonExists) {
                        loadLesson(savedState.lessonId);
                        return;
                    }
                }
                // ===== НОВОЕ: если нет lessonId — показываем список уроков, а не главную =====
                renderLevel();
            })
            .catch(() => {
                showWelcomePage();
            });
    } else {
        showWelcomePage();
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initApp() {
    // ===== ДОБАВЛЯЕМ ЭТУ СТРОКУ =====
    if (typeof loadProgress === 'function') {
        loadProgress();
    }
    // ===== КОНЕЦ ДОБАВЛЕНИЯ =====
    
    document.querySelectorAll('#levelsContainer .btn-level, #levelsContainerMobile .btn-level').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('#levelsContainer .btn-level').forEach(btn => {
        btn.onclick = function() {
            const level = this.getAttribute('data-level');
            
            if (typeof window.hasAccessToLevel === 'function') {
                if (!window.auth) {
                    alert('⏳ Пожалуйста, подождите, приложение загружается...');
                    return;
                }
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
            this.classList.add('active');
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => {
                if (b.getAttribute('data-level') === level) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
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
                if (!window.auth) {
                    alert('⏳ Пожалуйста, подождите, приложение загружается...');
                    return;
                }
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
            this.classList.add('active');
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => {
                if (b.getAttribute('data-level') === level) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            currentLevel = level;
            isWelcomePageVisible = false;
            loadLevel(currentLevel);
        };
    });
    
    const savedState = loadState();
    const firstLaunch = isFirstLaunch();
    
    if (firstLaunch) {
        showWelcomePage();
        return;
    }
    
    if (savedState && savedState.level) {
        if (typeof window.hasAccessToLevel === 'function') {
            if (!window.auth) {
                pendingState = { type: 'restore' };
                return;
            }
            if (!window.hasAccessToLevel(savedState.level)) {
                showWelcomePage();
                return;
            }
        }
        
        restoreState();
    } else {
        showWelcomePage();
    }
    
    if (typeof window.updateLevelButtons === 'function') {
        setTimeout(window.updateLevelButtons, 200);
    }
    
    setTimeout(updateCounter, 1000);
    setTimeout(updateCounter, 2000);
}

// ========== ГЛОБАЛЬНЫЙ ЭКСПОРТ ==========
window.currentLevel = currentLevel;
window.currentLesson = currentLesson;
window.courseData = courseData;
window.isWelcomePageVisible = isWelcomePageVisible;
window.appReady = appReady;
window.showWelcomePage = showWelcomePage;
window.showInstruction = showInstruction;
window.loadLevel = loadLevel;
window.loadLesson = loadLesson;
window.renderLevel = renderLevel;
window.renderLesson = renderLesson;
window.renderMode = renderMode;
window.updateCounter = updateCounter;
window.initApp = initApp;
window.loadState = loadState;
window.saveState = saveState;
window.clearAppState = clearAppState;
window.restoreState = restoreState;
window.onAuthReady = onAuthReady;
window.cacheLesson = cacheLesson;
window.getCachedLesson = getCachedLesson;
window.clearLessonCache = clearLessonCache;
window.clearLevelCache = clearLevelCache;

// ===== ПРИНУДИТЕЛЬНЫЙ ВЫЗОВ initApp =====
// Проверяем, загружен ли DOM
if (document.readyState === 'loading') {
    // Если DOM ещё загружается, ждём события
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔥 DOMContentLoaded: вызываем initApp');
        initApp();
    });
} else {
    // Если DOM уже загружен, вызываем сразу
    console.log('🔥 DOM уже загружен, вызываем initApp');
    initApp();
}
// ===== КОНЕЦ ПРИНУДИТЕЛЬНОГО ВЫЗОВА =====

console.log('🚀 app.js загружен (с новой структурой)');
