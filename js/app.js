// ====================================================================
// app.js — ГЛАВНОЕ ПРИЛОЖЕНИЕ (без перезагрузок)
// ====================================================================

// ========== ДАННЫЕ УРОКОВ ==========
const COURSE_DATA = {
    A1: {
        title: "Немецкий для начинающих",
        lessons: [
            {
                id: 1,
                title: "Знакомство. Глагол 'sein'.",
                grammar: `
                    <h3>📌 Глагол sein</h3>
                    <p>Глагол <strong>sein</strong> переводится как «быть», «находиться».</p>
                    <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
                        <tr style="background: #3B6FE0; color: white;">
                            <th>Местоимение</th><th>Форма</th>
                        </tr>
                        <tr><td>ich</td><td><strong>bin</strong></td></tr>
                        <tr><td>du</td><td><strong>bist</strong></td></tr>
                        <tr><td>er/sie/es</td><td><strong>ist</strong></td></tr>
                        <tr><td>wir</td><td><strong>sind</strong></td></tr>
                        <tr><td>ihr</td><td><strong>seid</strong></td></tr>
                        <tr><td>sie/Sie</td><td><strong>sind</strong></td></tr>
                    </table>
                    <div style="background: #E8F0FE; padding: 15px; border-radius: 12px; margin: 15px 0;">
                        <strong>🎯 ЗАПОМИНАЛКА:</strong><br>
                        ich bin, du bist, er ist, wir sind, ihr seid, sie sind
                    </div>
                `,
                examples: [
                    { de: "Ich bin Anna.", ru: "Я Анна." },
                    { de: "Du bist mein Freund.", ru: "Ты мой друг." },
                    { de: "Er ist mein Bruder.", ru: "Он мой брат." },
                    { de: "Sie ist meine Schwester.", ru: "Она моя сестра." },
                    { de: "Wir sind glücklich.", ru: "Мы счастливы." },
                    { de: "Ihr seid zu Hause.", ru: "Вы дома." },
                    { de: "Sie sind in Berlin.", ru: "Они в Берлине." },
                    { de: "Das ist mein Buch.", ru: "Это моя книга." }
                ],
                vocabulary: [
                    { de: "Hallo!", ru: "Привет!" },
                    { de: "Tschüss!", ru: "Пока!" },
                    { de: "Guten Morgen!", ru: "Доброе утро!" },
                    { de: "Guten Tag!", ru: "Добрый день!" },
                    { de: "Guten Abend!", ru: "Добрый вечер!" },
                    { de: "Gute Nacht!", ru: "Спокойной ночи!" },
                    { de: "Auf Wiedersehen!", ru: "До свидания!" },
                    { de: "Bitte!", ru: "Пожалуйста!" },
                    { de: "Danke!", ru: "Спасибо!" },
                    { de: "Ja", ru: "Да" },
                    { de: "Nein", ru: "Нет" },
                    { de: "der Mann", ru: "мужчина" },
                    { de: "die Frau", ru: "женщина" },
                    { de: "das Kind", ru: "ребёнок" },
                    { de: "der Vater", ru: "отец" },
                    { de: "die Mutter", ru: "мать" },
                    { de: "der Freund", ru: "друг" },
                    { de: "die Freundin", ru: "подруга" },
                    { de: "der Bruder", ru: "брат" },
                    { de: "die Schwester", ru: "сестра" }
                ],
                practice: [
                    { question: "Вставьте правильную форму sein:", sentence: "Ich ___ Anna.", answer: "bin", hint: "ich → bin" },
                    { question: "Вставьте правильную форму sein:", sentence: "Du ___ mein Freund.", answer: "bist", hint: "du → bist" },
                    { question: "Вставьте правильную форму sein:", sentence: "Er ___ mein Bruder.", answer: "ist", hint: "er → ist" },
                    { question: "Вставьте правильную форму sein:", sentence: "Wir ___ glücklich.", answer: "sind", hint: "wir → sind" },
                    { question: "Вставьте правильную форму sein:", sentence: "Ihr ___ zu Hause.", answer: "seid", hint: "ihr → seid" },
                    { question: "Переведите на немецкий:", sentence: "Я Анна.", answer: "Ich bin Anna.", hint: "Анна — это имя" },
                    { question: "Переведите на немецкий:", sentence: "Ты мой друг.", answer: "Du bist mein Freund.", hint: "Freund — мужской род" },
                    { question: "Переведите на немецкий:", sentence: "Мы счастливы.", answer: "Wir sind glücklich.", hint: "Множественное число" }
                ],
                dictation: [
                    { ru: "Привет! Меня зовут Анна.", de: "Hallo! Ich heiße Anna." },
                    { ru: "Ты мой друг.", de: "Du bist mein Freund." },
                    { ru: "Мы счастливы.", de: "Wir sind glücklich." },
                    { ru: "Добрый день, как дела?", de: "Guten Tag, wie geht es dir?" },
                    { ru: "Спасибо, хорошо!", de: "Danke, gut!" }
                ]
            }
        ]
    },
    A2: { title: "Немецкий для продолжающих (A2)", lessons: [] },
    B1: { title: "Немецкий для среднего уровня (B1)", lessons: [] },
    B2: { title: "Немецкий для продвинутого уровня (B2)", lessons: [] },
    C1: { title: "Немецкий для экспертов (C1)", lessons: [] }
};

// ========== СОСТОЯНИЕ ==========
let currentLevel = 'A1';
let currentLesson = null;
let currentMode = 'grammar';

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

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА ==========
function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    
    if (currentLesson) {
        const vocabCount = currentLesson.vocabulary ? currentLesson.vocabulary.length : 0;
        const practiceCount = currentLesson.practice ? currentLesson.practice.length : 0;
        el.textContent = `Слов: ${vocabCount} | Упражнений: ${practiceCount}`;
    } else if (currentLevel) {
        const data = COURSE_DATA[currentLevel];
        const lessonsCount = data && data.lessons ? data.lessons.length : 0;
        el.textContent = `Уровень ${currentLevel} | Уроков: ${lessonsCount}`;
    } else {
        el.textContent = 'Deutsch-Meister';
    }
}

// ========== ОТОБРАЖЕНИЕ УРОВНЕЙ ==========
function renderLevel(level) {
    console.log('📚 Загрузка уровня:', level);
    currentLevel = level;
    const data = COURSE_DATA[level];
    
    if (!data || !data.lessons || data.lessons.length === 0) {
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Уроки для уровня ${level} пока не добавлены.</div>
                <div style="font-size: 14px; margin-top: 10px;">Скоро они появятся!</div>
            </div>
        `;
        document.getElementById('modeIndicator').textContent = `Курс ${level}`;
        updateCounter();
        return;
    }

    let html = `<h2>📚 ${data.title}</h2><div style="margin-top: 20px;">`;
    data.lessons.forEach(lesson => {
        html += `
            <button class="lesson-btn" data-lesson-id="${lesson.id}">
                📘 Урок ${lesson.id}: ${lesson.title}
            </button>
        `;
    });
    html += `</div>`;
    document.getElementById('content').innerHTML = html;
    document.getElementById('modeIndicator').textContent = `Курс ${level}`;
    updateCounter();

    document.querySelectorAll('.lesson-btn').forEach(btn => {
        btn.onclick = function() {
            const id = parseInt(this.getAttribute('data-lesson-id'));
            renderLesson(level, id);
        };
    });
}

// ========== ОТОБРАЖЕНИЕ УРОКА ==========
function renderLesson(level, lessonId) {
    console.log('📖 Загрузка урока:', lessonId);
    const data = COURSE_DATA[level];
    const lesson = data.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    currentLesson = lesson;

    let html = `
        <button class="back-btn" onclick="renderLevel('${level}')">← К СПИСКУ УРОКОВ</button>
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
            document.querySelectorAll('.mode-btn').forEach(b => {
                b.classList.remove('active');
            });
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
    
    // Настраиваем кнопки уровней (десктоп)
    document.querySelectorAll('#levelsContainer .btn-level').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#levelsContainer .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderLevel(this.getAttribute('data-level'));
        };
    });
    
    // Настраиваем кнопки уровней (мобильные)
    document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('#levelsContainerMobile .btn-level').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderLevel(this.getAttribute('data-level'));
        };
    });
    
    // Настраиваем кнопки режимов (старые)
    document.querySelectorAll('.mode-btn:not([data-level])').forEach(btn => {
        btn.onclick = function() {
            alert('Этот режим будет доступен в следующей версии. Используйте уроки для изучения!');
        };
    });
    
    // Загружаем уровень A1 по умолчанию
    renderLevel('A1');
    
    console.log('✅ Deutsch-Meister готов!');
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});
