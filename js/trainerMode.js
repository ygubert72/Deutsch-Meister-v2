// ====================================================================
// trainerMode.js — Тренажёр (составление осмысленных предложений)
// ====================================================================

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerActiveWords = {};
let trainerHintIndex = 0;
let trainerHintWords = [];
let trainerDirection = 'ru_to_de';

function renderTrainer(container, lesson) {
    const vocab = lesson.vocabulary || [];
    if (vocab.length < 5) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Недостаточно слов для тренажёра.</div>
                <div style="font-size: 14px; margin-top: 10px;">В уроке должно быть минимум 5 слов.</div>
            </div>
        `;
        return;
    }

    // ===== СОЗДАЁМ КАРТУ СЛОВ ДЛЯ БЫСТРОГО ПОИСКА =====
    const wordMap = {};
    vocab.forEach(w => {
        const key = w.de.toLowerCase().replace(/[.,!?;:]/g, '');
        wordMap[key] = w;
    });

    // ===== ШАБЛОНЫ ОСМЫСЛЕННЫХ ПРЕДЛОЖЕНИЙ =====
    // Каждый шаблон содержит русский вариант, немецкий вариант и список обязательных слов
    const templates = [
        // Приветствия и прощания
        { ru: "Привет!", de: "Hallo!", required: ["hallo"] },
        { ru: "Пока!", de: "Tschüss!", required: ["tschüss"] },
        { ru: "Доброе утро!", de: "Guten Morgen!", required: ["guten", "morgen"] },
        { ru: "Добрый день!", de: "Guten Tag!", required: ["guten", "tag"] },
        { ru: "Добрый вечер!", de: "Guten Abend!", required: ["guten", "abend"] },
        { ru: "Спокойной ночи!", de: "Gute Nacht!", required: ["gute", "nacht"] },
        { ru: "До свидания!", de: "Auf Wiedersehen!", required: ["auf", "wiedersehen"] },
        { ru: "До скорого!", de: "Bis bald!", required: ["bis", "bald"] },
        
        // Вежливые слова
        { ru: "Пожалуйста!", de: "Bitte!", required: ["bitte"] },
        { ru: "Спасибо!", de: "Danke!", required: ["danke"] },
        { ru: "Извините!", de: "Entschuldigung!", required: ["entschuldigung"] },
        
        // Утверждения
        { ru: "Да", de: "Ja", required: ["ja"] },
        { ru: "Нет", de: "Nein", required: ["nein"] },
        { ru: "Возможно", de: "Vielleicht", required: ["vielleicht"] },
        { ru: "Конечно", de: "Natürlich", required: ["natürlich"] },
        { ru: "Точно", de: "Genau", required: ["genau"] },
        { ru: "Без проблем.", de: "Kein Problem.", required: ["kein", "problem"] },
        
        // Представление и знакомство
        { ru: "Привет! Меня зовут Анна.", de: "Hallo! Ich heiße Anna.", required: ["hallo", "ich", "heiße"] },
        { ru: "Меня зовут Анна.", de: "Ich heiße Anna.", required: ["ich", "heiße"] },
        { ru: "Как тебя зовут?", de: "Wie heißt du?", required: ["wie", "heißt", "du"] },
        { ru: "Я Анна.", de: "Ich bin Anna.", required: ["ich", "bin"] },
        { ru: "Ты мой друг.", de: "Du bist mein Freund.", required: ["du", "bist", "mein", "freund"] },
        { ru: "Это мой друг.", de: "Das ist mein Freund.", required: ["das", "ist", "mein", "freund"] },
        { ru: "Это моя подруга.", de: "Das ist meine Freundin.", required: ["das", "ist", "meine", "freundin"] },
        { ru: "Он мой брат.", de: "Er ist mein Bruder.", required: ["er", "ist", "mein", "bruder"] },
        { ru: "Она моя сестра.", de: "Sie ist meine Schwester.", required: ["sie", "ist", "meine", "schwester"] },
        { ru: "Мой отец.", de: "Mein Vater.", required: ["mein", "vater"] },
        { ru: "Моя мать.", de: "Meine Mutter.", required: ["meine", "mutter"] },
        { ru: "Это моя семья.", de: "Das ist meine Familie.", required: ["das", "ist", "meine", "familie"] },
        { ru: "Мы друзья.", de: "Wir sind Freunde.", required: ["wir", "sind", "freunde"] },
        { ru: "Мы счастливы.", de: "Wir sind glücklich.", required: ["wir", "sind", "glücklich"] },
        
        // Вопросы о месте
        { ru: "Где ты?", de: "Wo bist du?", required: ["wo", "bist", "du"] },
        { ru: "Я здесь.", de: "Ich bin hier.", required: ["ich", "bin", "hier"] },
        { ru: "Я из России.", de: "Ich komme aus Russland.", required: ["ich", "komme", "aus", "russland"] },
        { ru: "Я из Германии.", de: "Ich komme aus Deutschland.", required: ["ich", "komme", "aus", "deutschland"] },
        { ru: "Где ты живёшь?", de: "Wo wohnst du?", required: ["wo", "wohnst", "du"] },
        
        // Предметы
        { ru: "Это моя книга.", de: "Das ist mein Buch.", required: ["das", "ist", "mein", "buch"] },
        { ru: "Это мой дом.", de: "Das ist mein Haus.", required: ["das", "ist", "mein", "haus"] },
        { ru: "Это моя квартира.", de: "Das ist meine Wohnung.", required: ["das", "ist", "meine", "wohnung"] },
        { ru: "Это моя комната.", de: "Das ist mein Zimmer.", required: ["das", "ist", "mein", "zimmer"] },
        { ru: "Это моя кухня.", de: "Das ist meine Küche.", required: ["das", "ist", "meine", "küche"] },
        
        // Вещи
        { ru: "Стол.", de: "Der Tisch.", required: ["der", "tisch"] },
        { ru: "Стул.", de: "Der Stuhl.", required: ["der", "stuhl"] },
        { ru: "Кровать.", de: "Das Bett.", required: ["das", "bett"] },
        { ru: "Собака.", de: "Der Hund.", required: ["der", "hund"] },
        { ru: "Кошка.", de: "Die Katze.", required: ["die", "katze"] },
        
        // Состояния
        { ru: "Я устал.", de: "Ich bin müde.", required: ["ich", "bin", "müde"] },
        { ru: "Я голоден.", de: "Ich habe Hunger.", required: ["ich", "habe", "hunger"] },
        
        // Вопросы
        { ru: "Как дела?", de: "Wie geht es dir?", required: ["wie", "geht", "es", "dir"] },
        { ru: "У меня всё хорошо.", de: "Mir geht es gut.", required: ["mir", "geht", "es", "gut"] },
        { ru: "У тебя есть время?", de: "Hast du Zeit?", required: ["hast", "du", "zeit"] },
        
        // Ответы
        { ru: "Спасибо, хорошо!", de: "Danke, gut!", required: ["danke", "gut"] }
    ];

    // ===== ФИЛЬТРУЕМ ШАБЛОНЫ =====
    // Оставляем только те, где все слова есть в лексике урока
    const availableTemplates = templates.filter(template => {
        const words = template.de.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
        return words.every(w => {
            const cleanW = w.replace(/[.,!?;:]/g, '');
            return wordMap[cleanW] !== undefined;
        });
    });

    if (availableTemplates.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div>Недостаточно подходящих слов для осмысленных предложений.</div>
                <div style="font-size: 14px; margin-top: 10px;">Попробуйте другой урок.</div>
            </div>
        `;
        return;
    }

    // Перемешиваем и берём до 10 предложений
    const shuffled = [...availableTemplates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    trainerSentences = shuffled.slice(0, 10);

    trainerIndex = 0;
    trainerDirection = 'ru_to_de';
    showTrainerSentence(container);
}

function showTrainerSentence(container) {
    if (trainerIndex >= trainerSentences.length) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                <div style="font-size: 24px; margin-bottom: 20px;">Поздравляем!</div>
                <div style="font-size: 16px; margin-bottom: 20px;">Вы завершили все предложения в тренажёре!</div>
                <button class="ctrl-btn" onclick="renderMode('trainer', window.currentLesson)" style="padding: 10px 30px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer;">НАЧАТЬ ЗАНОВО</button>
            </div>
        `;
        return;
    }

    trainerCurrentSentence = trainerSentences[trainerIndex];
    
    // Разбиваем предложение на отдельные слова (убираем знаки препинания для разбивки)
    const deWords = trainerCurrentSentence.de.replace(/[.,!?;:]/g, '').split(/\s+/);
    const ruWords = trainerCurrentSentence.ru.replace(/[.,!?;:]/g, '').split(/\s+/);

    // Создаём массив объектов для перемешивания
    const words = deWords.map((w, i) => ({
        de: w,
        ru: ruWords[i] || w,
        originalIndex: i
    }));

    // Перемешиваем слова
    const shuffledWords = [...words];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
    }

    trainerSelectedWords = [];
    trainerAvailableWords = shuffledWords;
    trainerActiveWords = {};
    trainerAvailableWords.forEach(w => { trainerActiveWords[w.de] = true; });
    trainerHintIndex = 0;
    trainerHintWords = deWords;

    const isRuToDe = trainerDirection === 'ru_to_de';
    const questionText = isRuToDe ? trainerCurrentSentence.ru : trainerCurrentSentence.de;

    let html = `
        <div style="text-align: center;">
            <button class="dir-btn" id="trainerDirBtn" style="background: #3B6FE0; color: white; padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
                ${isRuToDe ? '🇷🇺→🇩🇪' : '🇩🇪→🇷🇺'}
            </button>
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Составьте предложение на немецком:</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-weight: bold; font-size: 20px; min-height: 60px; color: #1A1A1A;" id="trainerResult">
                ${trainerSelectedWords.map(w => w.de).join(' ') || 'Нажмите на слова, чтобы собрать предложение'}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 15px 0;" id="trainerWordsContainer">
                ${trainerAvailableWords.map(word => `
                    <button class="word-btn" data-word="${word.de}">
                        ${word.de}
                    </button>
                `).join('')}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0;">
                <button class="ctrl-btn" id="trainerUndoBtn">↩️ ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="trainerResetBtn">🔄 СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn check-btn" id="trainerCheckBtn">✅ ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="trainerSpeakBtn">🔊 ОЗВУЧИТЬ</button>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0;">
                <button class="ctrl-btn" id="trainerHintBtn">💡 ПОДСКАЗКА</button>
                <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 12px; padding: 10px 16px; flex: 1; min-width: 150px; font-size: 13px; color: #3B6FE0; font-weight: bold; text-align: center; min-height: 42px;" id="trainerHintLabel"></div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0;">
                <button class="ctrl-btn" id="trainerPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="trainerNextBtn">ВПЕРЕД ▶</button>
                <div style="font-size: 14px; color: #888; display: flex; align-items: center;">${trainerIndex + 1} / ${trainerSentences.length}</div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById('trainerDirBtn').onclick = function() {
        trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
        this.textContent = trainerDirection === 'ru_to_de' ? '🇷🇺→🇩🇪' : '🇩🇪→🇷🇺';
        showTrainerSentence(container);
    };

    container.querySelectorAll('#trainerWordsContainer .word-btn').forEach(btn => {
        btn.onclick = function() {
            const word = this.getAttribute('data-word');
            if (trainerActiveWords[word]) {
                trainerActiveWords[word] = false;
                const foundWord = trainerAvailableWords.find(w => w.de === word);
                if (foundWord) {
                    trainerSelectedWords.push(foundWord);
                    updateTrainerDisplay(container);
                }
            }
        };
    });

    document.getElementById('trainerUndoBtn').onclick = function() {
        if (trainerSelectedWords.length > 0) {
            const lastWord = trainerSelectedWords.pop();
            trainerActiveWords[lastWord.de] = true;
            updateTrainerDisplay(container);
        }
    };

    document.getElementById('trainerResetBtn').onclick = function() {
        trainerSelectedWords = [];
        trainerAvailableWords.forEach(w => { trainerActiveWords[w.de] = true; });
        updateTrainerDisplay(container);
        document.getElementById('trainerHintLabel').textContent = '';
        trainerHintIndex = 0;
    };

    document.getElementById('trainerCheckBtn').onclick = function() {
        if (trainerSelectedWords.length === 0) {
            const result = document.getElementById('trainerResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }

        const correctAnswer = trainerCurrentSentence.de;
        const userAnswer = trainerSelectedWords.map(w => w.de).join(' ');
        const result = document.getElementById('trainerResult');

        if (userAnswer === correctAnswer) {
            result.style.backgroundColor = '#C8E6C9';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                trainerIndex++;
                showTrainerSentence(container);
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            trainerSelectedWords.forEach(w => { trainerActiveWords[w.de] = true; });
            trainerSelectedWords = [];
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                updateTrainerDisplay(container);
            }, 500);
        }
    };

    document.getElementById('trainerSpeakBtn').onclick = function() {
        speak(trainerCurrentSentence.de);
    };

    document.getElementById('trainerHintBtn').onclick = function() {
        const hintLabel = document.getElementById('trainerHintLabel');
        if (trainerHintIndex < trainerHintWords.length) {
            const currentHint = trainerHintWords.slice(0, trainerHintIndex + 1).join(' ');
            hintLabel.textContent = '💡 ' + currentHint;
            trainerHintIndex++;
        } else {
            hintLabel.textContent = '💡 Полное предложение: ' + trainerHintWords.join(' ');
        }
    };

    document.getElementById('trainerPrevBtn').onclick = function() {
        if (trainerIndex > 0) {
            trainerIndex--;
            showTrainerSentence(container);
        }
    };

    document.getElementById('trainerNextBtn').onclick = function() {
        if (trainerIndex + 1 < trainerSentences.length) {
            trainerIndex++;
            showTrainerSentence(container);
        }
    };
}

function updateTrainerDisplay(container) {
    const result = document.getElementById('trainerResult');
    const wordsContainer = document.getElementById('trainerWordsContainer');
    if (result) {
        result.textContent = trainerSelectedWords.map(w => w.de).join(' ') || 'Нажмите на слова, чтобы собрать предложение';
        result.style.backgroundColor = '#FFFFFF';
    }
    if (wordsContainer) {
        wordsContainer.innerHTML = '';
        trainerAvailableWords.forEach(word => {
            if (trainerActiveWords[word.de]) {
                const btn = document.createElement('button');
                btn.className = 'word-btn';
                btn.textContent = word.de;
                btn.onclick = function() {
                    if (trainerActiveWords[word.de]) {
                        trainerActiveWords[word.de] = false;
                        const foundWord = trainerAvailableWords.find(w => w.de === word.de);
                        if (foundWord) {
                            trainerSelectedWords.push(foundWord);
                            updateTrainerDisplay(container);
                        }
                    }
                };
                wordsContainer.appendChild(btn);
            }
        });
    }
}
