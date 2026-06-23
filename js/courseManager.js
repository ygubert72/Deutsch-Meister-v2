// courseManager.js — управление новым структурированным курсом

const CourseManager = {
    currentLevel: 'A1',
    currentLessonId: null,
    courseData: null,
    lessonData: null,

    // Загрузить конфигурацию уровня
    async loadLevel(level) {
        this.currentLevel = level;
        try {
            const response = await fetch(`docs/course/${level}/index.json`);
            if (!response.ok) throw new Error('Курс не найден');
            this.courseData = await response.json();
            this.renderLevelMenu();
        } catch (error) {
            console.error('Ошибка загрузки курса:', error);
            document.getElementById('content').innerHTML = `
                <div class="no-users">
                    <div class="icon">📚</div>
                    <div>Курс для уровня ${level} пока не загружен.</div>
                </div>
            `;
        }
    },

    // Отобразить меню уроков
    renderLevelMenu() {
        if (!this.courseData) return;
        const container = document.getElementById('content');
        let html = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="lesson-header">
                    <div class="lesson-title">📚 ${this.courseData.title}</div>
                    <div>Всего уроков: ${this.courseData.lessons.length}</div>
                </div>
                <div id="lessonList" style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
        `;

        this.courseData.lessons.forEach(lesson => {
            html += `
                <button class="lesson-grid-btn" data-lesson-id="${lesson.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; cursor: pointer; text-align: left;">
                    <span>📘 Урок ${lesson.id}: ${lesson.title}</span>
                </button>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;

        // Добавляем обработчики для кнопок уроков
        document.querySelectorAll('[data-lesson-id]').forEach(btn => {
            btn.onclick = () => {
                const lessonId = parseInt(btn.getAttribute('data-lesson-id'));
                this.loadLesson(lessonId);
            };
        });
    },

    // Загрузить конкретный урок
    async loadLesson(lessonId) {
        this.currentLessonId = lessonId;
        try {
            const lessonInfo = this.courseData.lessons.find(l => l.id === lessonId);
            if (!lessonInfo) throw new Error('Урок не найден');

            const response = await fetch(`docs/course/${this.currentLevel}/lessons/${lessonInfo.file}`);
            if (!response.ok) throw new Error('Файл урока не найден');
            this.lessonData = await response.json();

            this.renderLesson();
        } catch (error) {
            console.error('Ошибка загрузки урока:', error);
            document.getElementById('content').innerHTML = `
                <div class="no-users">
                    <div class="icon">❌</div>
                    <div>Ошибка загрузки урока.</div>
                </div>
            `;
        }
    },

    // Отобразить урок со всеми режимами
    renderLesson() {
        if (!this.lessonData) return;
        const container = document.getElementById('content');
        const lesson = this.lessonData;

        // Сохраняем в глобальную переменную для доступа из режимов
        window.currentLessonData = lesson;
        window.currentLessonId = this.currentLessonId;

        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <button class="ctrl-btn" id="backToLevelMenu" style="margin-bottom: 15px; cursor: pointer; background: #3B6FE0; color: white;">← К СПИСКУ УРОКОВ</button>
                <div class="lesson-header">
                    <div class="lesson-title">📖 Урок ${lesson.id}: ${lesson.title}</div>
                </div>
                <div class="lesson-mode" id="lessonModeContainer" style="display: flex; gap: 12px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap;">
                    <button class="lesson-mode-btn active" data-mode="grammar">📘 ГРАММАТИКА</button>
                    <button class="lesson-mode-btn" data-mode="vocabulary">📚 ЛЕКСИКА</button>
                    <button class="lesson-mode-btn" data-mode="practice">✍️ ПРАКТИКА</button>
                    <button class="lesson-mode-btn" data-mode="quiz">🧠 ТЕСТ</button>
                    <button class="lesson-mode-btn" data-mode="trainer">🏋️ ТРЕНАЖЁР</button>
                    <button class="lesson-mode-btn" data-mode="dictation">✏️ ПРАВОПИСАНИЕ</button>
                    <button class="lesson-mode-btn" data-mode="dialogues">💬 ДИАЛОГИ</button>
                </div>
                <div id="lessonContent" style="background: white; border-radius: 16px; padding: 25px; line-height: 1.6;">
                    <!-- Сюда будет загружаться содержимое режима -->
                </div>
            </div>
        `;

        // Обработчик кнопки "Назад"
        document.getElementById('backToLevelMenu').onclick = () => {
            window.currentLessonData = null;
            this.renderLevelMenu();
        };

        // Обработчики для кнопок режимов
        document.querySelectorAll('#lessonModeContainer .lesson-mode-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('#lessonModeContainer .lesson-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.getAttribute('data-mode');
                this.renderMode(mode);
            };
        });

        // Загружаем грамматику по умолчанию
        this.renderMode('grammar');
    },

    // Отобразить выбранный режим
    renderMode(mode) {
        const container = document.getElementById('lessonContent');
        if (!container) return;

        // Используем существующие функции из других файлов, если они есть
        // Или добавляем новую логику
        switch (mode) {
            case 'grammar':
                this.renderGrammar(container);
                break;
            case 'vocabulary':
                this.renderVocabulary(container);
                break;
            case 'practice':
                this.renderPractice(container);
                break;
            case 'quiz':
                this.renderQuiz(container);
                break;
            case 'trainer':
                this.renderTrainer(container);
                break;
            case 'dictation':
                this.renderDictation(container);
                break;
            case 'dialogues':
                this.renderDialogues(container);
                break;
            default:
                container.innerHTML = '<div>Режим не найден</div>';
        }
    },

    // ----- ОТОБРАЖЕНИЕ РЕЖИМОВ -----

    renderGrammar(container) {
        const grammar = window.currentLessonData?.grammar;
        if (!grammar) {
            container.innerHTML = '<div>Теория для этого урока пока не загружена.</div>';
            return;
        }

        let examplesHtml = '';
        if (grammar.examples && grammar.examples.length) {
            examplesHtml = '<div style="margin-top: 20px;"><h4>📝 Примеры:</h4><ul style="list-style: none; padding: 0;">';
            for (const ex of grammar.examples) {
                const safeText = ex.de.replace(/'/g, "\\'");
                examplesHtml += `
                    <li style="background: #E8F0FE; margin: 8px 0; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${ex.de}</strong> — ${ex.ru}</span>
                        <button class="speak-btn-inline" onclick="speak('${safeText}')">🔊</button>
                    </li>
                `;
            }
            examplesHtml += '</ul></div>';
        }

        container.innerHTML = `
            <div style="background: white; border-radius: 16px; line-height: 1.6;">
                ${grammar.theory}
                ${examplesHtml}
            </div>
        `;
    },

    renderVocabulary(container) {
        const vocab = window.currentLessonData?.vocabulary;
        if (!vocab || vocab.length === 0) {
            container.innerHTML = '<div>Слова для этого урока пока не загружены.</div>';
            return;
        }

        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
        `;
        vocab.forEach(word => {
            const safeDe = word.de.replace(/'/g, "\\'");
            html += `
                <div style="background: #F5F5F5; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${word.de}</strong> — ${word.ru}</div>
                    <button class="speak-btn-inline" onclick="speak('${safeDe}')">🔊</button>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    },

    renderPractice(container) {
        const exercises = window.currentLessonData?.practice;
        if (!exercises || exercises.length === 0) {
            container.innerHTML = '<div>Упражнения для этого урока пока не загружены.</div>';
            return;
        }

        // Используем существующую логику из grammarMode.js для отображения упражнений
        // Передаем упражнения в глобальную функцию, если она есть
        if (typeof window.showGrammarExercise === 'function') {
            // Сохраняем упражнения в глобальную переменную и показываем первое
            window.currentExercises = exercises;
            window.currentExerciseIndex = 0;
            window.showGrammarExercise(exercises[0]);
            container.innerHTML = document.getElementById('grammarContent').innerHTML;
            // Перемещаем контент в наш контейнер
            const grammarContent = document.getElementById('grammarContent');
            if (grammarContent) {
                container.innerHTML = grammarContent.innerHTML;
                // Перепривязываем события
                this.rebindExerciseEvents(container);
            }
        } else {
            // Простой показ упражнений
            let html = `<h3>✍️ Упражнения</h3>`;
            exercises.forEach((ex, index) => {
                html += `
                    <div style="background: #E8F0FE; margin: 10px 0; padding: 15px; border-radius: 12px;">
                        <div><strong>Упражнение ${index + 1}:</strong> ${ex.question}</div>
                        <div style="margin-top: 5px; color: #666;">${ex.sentence}</div>
                        <div style="margin-top: 5px; color: #999; font-size: 14px;">Подсказка: ${ex.hint}</div>
                        <div style="margin-top: 5px; color: #4CAF50;">Ответ: ${ex.answer}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    },

    rebindExerciseEvents(container) {
        // Перепривязываем события для интерактивных упражнений
        const checkBtn = container.querySelector('#grammarCheckBtn');
        const speakBtn = container.querySelector('#grammarSpeakBtn');
        const hintBtn = container.querySelector('#grammarHintBtn');
        const prevBtn = container.querySelector('#grammarPrevBtn');
        const nextBtn = container.querySelector('#grammarNextBtn');

        if (checkBtn) checkBtn.onclick = () => {
            const input = document.getElementById('grammarAnswerInput');
            if (input) {
                const userAnswer = input.value.trim().toLowerCase();
                const exercise = window.currentExercises?.[window.currentExerciseIndex];
                if (exercise) {
                    this.checkPracticeAnswer(userAnswer, exercise, container);
                }
            }
        };

        if (speakBtn) speakBtn.onclick = () => {
            const exercise = window.currentExercises?.[window.currentExerciseIndex];
            if (exercise && window.speak) {
                const text = exercise.sentence || exercise.question;
                window.speak(text);
            }
        };

        if (hintBtn) hintBtn.onclick = () => {
            const hintLabel = container.querySelector('#grammarHintLabel');
            const exercise = window.currentExercises?.[window.currentExerciseIndex];
            if (hintLabel && exercise) {
                hintLabel.innerHTML = `💡 ${exercise.hint || 'Попробуйте ещё раз!'}`;
                setTimeout(() => { hintLabel.innerHTML = ''; }, 4000);
            }
        };

        if (nextBtn) nextBtn.onclick = () => {
            if (window.currentExerciseIndex + 1 < window.currentExercises.length) {
                window.currentExerciseIndex++;
                const exercise = window.currentExercises[window.currentExerciseIndex];
                if (exercise && window.showGrammarExercise) {
                    window.showGrammarExercise(exercise);
                    container.innerHTML = document.getElementById('grammarContent').innerHTML;
                    this.rebindExerciseEvents(container);
                }
            }
        };

        if (prevBtn) prevBtn.onclick = () => {
            if (window.currentExerciseIndex > 0) {
                window.currentExerciseIndex--;
                const exercise = window.currentExercises[window.currentExerciseIndex];
                if (exercise && window.showGrammarExercise) {
                    window.showGrammarExercise(exercise);
                    container.innerHTML = document.getElementById('grammarContent').innerHTML;
                    this.rebindExerciseEvents(container);
                }
            }
        };
    },

    checkPracticeAnswer(userAnswer, exercise, container) {
        const correctAnswer = exercise.answer.toLowerCase();
        const input = container.querySelector('#grammarAnswerInput');

        if (userAnswer === correctAnswer) {
            if (input) {
                input.style.backgroundColor = '#C8E6C9';
                input.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    input.style.backgroundColor = '';
                    input.style.borderColor = '#D0D0D0';
                    input.value = '';
                    // Переход к следующему упражнению
                    if (window.currentExerciseIndex + 1 < window.currentExercises.length) {
                        window.currentExerciseIndex++;
                        const nextExercise = window.currentExercises[window.currentExerciseIndex];
                        if (nextExercise && window.showGrammarExercise) {
                            window.showGrammarExercise(nextExercise);
                            container.innerHTML = document.getElementById('grammarContent').innerHTML;
                            this.rebindExerciseEvents(container);
                        }
                    } else {
                        container.innerHTML = `
                            <div style="text-align: center; padding: 40px;">
                                <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                                <div style="font-size: 24px; margin-bottom: 20px;">Поздравляем!</div>
                                <div style="font-size: 16px; margin-bottom: 20px;">Вы успешно завершили все упражнения этого урока!</div>
                            </div>
                        `;
                    }
                }, 500);
            }
        } else {
            if (input) {
                input.style.backgroundColor = '#FFCDD2';
                input.style.borderColor = '#F44336';
                setTimeout(() => {
                    input.style.backgroundColor = '';
                    input.style.borderColor = '#D0D0D0';
                    input.value = '';
                    input.focus();
                }, 500);
            }
        }
    },

    renderQuiz(container) {
        // Используем существующий функционал quizMode.js, но адаптируем его под наши данные
        const vocab = window.currentLessonData?.vocabulary;
        if (!vocab || vocab.length === 0) {
            container.innerHTML = '<div>Нет слов для теста.</div>';
            return;
        }

        // Передаем слова в глобальный quizMode
        if (typeof window.initQuizWithWords === 'function') {
            window.initQuizWithWords(vocab);
            // Показываем контейнер для квиза
            container.innerHTML = `
                <div id="quizContainer">
                    <div style="text-align: center;">
                        <div class="quiz-question" id="quizQuestion"></div>
                        <div class="quiz-grid" id="quizGrid"></div>
                        <div class="hint" id="quizProgress"></div>
                    </div>
                </div>
            `;
            // Запускаем квиз
            if (typeof window.showQuiz === 'function') {
                window.showQuiz();
            }
        } else {
            container.innerHTML = '<div>Тест пока не доступен. Используйте режим "Лексика" для изучения слов.</div>';
        }
    },

    renderTrainer(container) {
        // Используем существующий функционал sentencesMode.js
        const vocab = window.currentLessonData?.vocabulary;
        if (!vocab || vocab.length < 5) {
            container.innerHTML = '<div>Недостаточно слов для тренажёра. Нужно минимум 5 слов.</div>';
            return;
        }

        container.innerHTML = `
            <div id="trainerContainer">
                <div style="text-align: center;">
                    <div class="sent-question" id="sentQuestion"></div>
                    <div class="sent-result" id="sentResult"></div>
                    <div class="words-container" id="sentWordsContainer"></div>
                    <div class="btn-group">
                        <button class="ctrl-btn" id="sentUndoBtn">ВЕРНУТЬ СЛОВО</button>
                        <button class="ctrl-btn" id="sentResetBtn">СБРОСИТЬ ВСЁ</button>
                        <button class="ctrl-btn check-btn" id="sentCheckBtn">ПРОВЕРИТЬ</button>
                        <button class="ctrl-btn" id="sentSpeakBtn">🔊</button>
                    </div>
                    <div class="hint-area">
                        <button class="ctrl-btn" id="sentHintBtn">ПОДСКАЗКА</button>
                        <div class="hint-label" id="sentHintLabel"></div>
                    </div>
                </div>
            </div>
        `;

        // Создаем простой тренажер на основе слов урока
        if (typeof window.initSentenceTrainer === 'function') {
            window.initSentenceTrainer(vocab);
        } else {
            container.innerHTML += `
                <div style="margin-top: 20px; padding: 20px; background: #FFF3E0; border-radius: 12px;">
                    <p><strong>ℹ️ Тренажёр в разработке</strong></p>
                    <p>Вы можете использовать слова из этого урока для составления предложений.</p>
                    <p>Слова урока: ${vocab.map(w => w.de).join(', ')}</p>
                </div>
            `;
        }
    },

    renderDictation(container) {
        const sentences = window.currentLessonData?.dictation?.sentences;
        if (!sentences || sentences.length === 0) {
            container.innerHTML = '<div>Нет предложений для диктанта.</div>';
            return;
        }

        let html = `
            <h3>✏️ Правописание</h3>
            <p>Напишите перевод следующих предложений на немецком языке:</p>
            <div style="margin-top: 20px;">
        `;

        sentences.forEach((s, index) => {
            html += `
                <div style="background: #F5F5F5; margin: 10px 0; padding: 15px; border-radius: 12px;">
                    <div><strong>${index + 1}.</strong> ${s.ru}</div>
                    <div style="margin-top: 10px;">
                        <input type="text" class="dictation-input" data-index="${index}" 
                            style="width: 100%; padding: 10px; border: 2px solid #D0D0D0; border-radius: 8px; font-size: 16px;"
                            placeholder="Введите перевод...">
                        <button class="dictation-check-btn" data-index="${index}" 
                            style="margin-top: 10px; padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            ПРОВЕРИТЬ
                        </button>
                        <div class="dictation-result" data-index="${index}" style="margin-top: 10px; font-weight: bold;"></div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Добавляем обработчики для проверки
        container.querySelectorAll('.dictation-check-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.getAttribute('data-index'));
                const input = container.querySelector(`.dictation-input[data-index="${index}"]`);
                const result = container.querySelector(`.dictation-result[data-index="${index}"]`);
                const correctAnswer = sentences[index].de;

                if (!input || !result) return;

                const userAnswer = input.value.trim();
                // Простая проверка: игнорируем регистр и лишние пробелы
                const normalizedUser = userAnswer.toLowerCase().replace(/\s+/g, ' ');
                const normalizedCorrect = correctAnswer.toLowerCase().replace(/\s+/g, ' ');

                if (normalizedUser === normalizedCorrect) {
                    result.innerHTML = '✅ Правильно!';
                    result.style.color = '#4CAF50';
                    input.style.borderColor = '#4CAF50';
                } else {
                    result.innerHTML = `❌ Неправильно. Правильный ответ: <strong>${correctAnswer}</strong>`;
                    result.style.color = '#F44336';
                    input.style.borderColor = '#F44336';
                    // Показываем правильный ответ через секунду
                    setTimeout(() => {
                        result.innerHTML = `Правильный ответ: <strong>${correctAnswer}</strong>`;
                        result.style.color = '#3B6FE0';
                    }, 2000);
                }
            };
        });
    },

    renderDialogues(container) {
        const dialogueData = window.currentLessonData?.dialogues;
        if (!dialogueData || !dialogueData.steps || dialogueData.steps.length === 0) {
            container.innerHTML = '<div>Диалоги для этого урока пока не загружены.</div>';
            return;
        }

        let html = `
            <h3>💬 Диалог: ${dialogueData.scenario || 'Разговор'}</h3>
            <div id="dialogueContainer" style="margin-top: 20px;">
                <div id="dialogueMessages" style="background: #F5F5F5; border-radius: 12px; padding: 15px; min-height: 150px; margin-bottom: 20px;">
                    <div style="text-align: center; color: #999;">Нажмите "Начать диалог", чтобы начать</div>
                </div>
                <div id="dialogueControls" style="text-align: center;">
                    <button id="dialogueStartBtn" class="ctrl-btn" style="background: #4CAF50; color: white; padding: 12px 30px;">▶️ НАЧАТЬ ДИАЛОГ</button>
                    <div id="dialogueInputArea" style="display: none; margin-top: 15px;">
                        <input type="text" id="dialogueUserInput" placeholder="Ваш ответ..." style="width: 70%; padding: 10px; border: 2px solid #D0D0D0; border-radius: 8px;">
                        <button id="dialogueSendBtn" class="ctrl-btn" style="background: #3B6FE0; color: white;">ОТПРАВИТЬ</button>
                        <button id="dialogueListenBtn" class="ctrl-btn" style="background: #FF9800; color: white;">🎤 СКАЗАТЬ</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Инициализируем диалог
        let dialogueStep = 0;
        let dialogueMessages = document.getElementById('dialogueMessages');
        const startBtn = document.getElementById('dialogueStartBtn');
        const inputArea = document.getElementById('dialogueInputArea');
        const userInput = document.getElementById('dialogueUserInput');
        const sendBtn = document.getElementById('dialogueSendBtn');
        const listenBtn = document.getElementById('dialogueListenBtn');

        function addMessage(speaker, text) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                margin: 8px 0; padding: 10px 14px; border-radius: 12px;
                background: ${speaker === 'You' ? '#E3F2FD' : '#E8F5E9'};
                text-align: ${speaker === 'You' ? 'right' : 'left'};
                border: ${speaker === 'You' ? '1px solid #90CAF9' : '1px solid #A5D6A7'};
            `;
            messageDiv.innerHTML = `<strong>${speaker}:</strong> ${text}`;
            dialogueMessages.appendChild(messageDiv);
            dialogueMessages.scrollTop = dialogueMessages.scrollHeight;
        }

        function showDialogueStep(stepIndex) {
            const steps = dialogueData.steps;
            if (stepIndex >= steps.length) {
                addMessage('🎉', 'Диалог завершён! Отлично!');
                inputArea.style.display = 'none';
                startBtn.textContent = '🔄 ПРОЙТИ СНОВА';
                startBtn.onclick = () => {
                    dialogueMessages.innerHTML = '';
                    dialogueStep = 0;
                    startBtn.textContent = '▶️ НАЧАТЬ ДИАЛОГ';
                    startBtn.onclick = startDialogue;
                };
                return;
            }

            const step = steps[stepIndex];
            addMessage(step.speaker, step.text);
            // Озвучиваем текст
            if (window.speak) {
                window.speak(step.text);
            }

            // Показываем поле ввода для следующего шага
            inputArea.style.display = 'block';
            userInput.value = '';
            userInput.focus();

            // Сохраняем текущий шаг для проверки
            sendBtn.onclick = () => {
                const answer = userInput.value.trim();
                if (!answer) {
                    alert('Введите ответ!');
                    return;
                }

                // Проверяем ответ (ищем ключевые слова)
                const isCorrect = step.expected_keywords.some(keyword =>
                    answer.toLowerCase().includes(keyword.toLowerCase())
                );

                if (isCorrect) {
                    addMessage('👤 Вы', answer);
                    addMessage('✅', step.success_response || 'Правильно!');
                    dialogueStep++;
                    setTimeout(() => showDialogueStep(dialogueStep), 1500);
                    inputArea.style.display = 'none';
                } else {
                    addMessage('👤 Вы', answer);
                    addMessage('❌', step.fail_response || 'Попробуйте ещё раз.');
                    addMessage('💡', `Подсказка: ${step.hint}`);
                    userInput.value = '';
                    userInput.focus();
                }
            };

            // Обработка голосового ввода
            listenBtn.onclick = () => {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert('Ваш браузер не поддерживает голосовой ввод.');
                    return;
                }

                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.lang = 'de-DE';
                recognition.interimResults = false;

                listenBtn.textContent = '🎤 СЛУШАЮ...';
                listenBtn.style.background = '#F44336';

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    userInput.value = transcript;
                    listenBtn.textContent = '🎤 СКАЗАТЬ';
                    listenBtn.style.background = '#FF9800';
                    // Автоматически отправляем ответ
                    sendBtn.click();
                };

                recognition.onerror = () => {
                    listenBtn.textContent = '🎤 СКАЗАТЬ';
                    listenBtn.style.background = '#FF9800';
                    alert('Не удалось распознать речь. Попробуйте ввести ответ вручную.');
                };

                recognition.start();
            };
        }

        function startDialogue() {
            dialogueMessages.innerHTML = '';
            dialogueStep = 0;
            startBtn.textContent = '⏳ ДИАЛОГ ИДЁТ...';
            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            showDialogueStep(0);
        }

        startBtn.onclick = startDialogue;
    }
};

// Экспортируем в глобальную область
window.CourseManager = CourseManager;
