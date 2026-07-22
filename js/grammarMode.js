// ====================================================================
// grammarMode.js — Грамматика (теория + примеры + словарь + упражнения)
// ====================================================================

// Хранилище состояния подсказок для каждого упражнения
let grammarHintStates = {};

function renderGrammar(container, lesson) {
    let html = '';

    // 1. ТЕОРИЯ
    if (lesson.grammar) {
        html += `<div style="line-height: 1.8; margin-bottom: 25px;">${lesson.grammar}</div>`;
    }

    // 2. ПРИМЕРЫ
    if (lesson.examples && lesson.examples.length) {
        html += `<h4 style="margin-top: 20px;">📝 Примеры:</h4><div>`;
        lesson.examples.forEach(ex => {
            const safeText = ex.de.replace(/'/g, "\\'");
            html += `
                <div style="background: #E8F0FE; padding: 10px; border-radius: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${ex.de}</strong> — ${ex.ru}</span>
                    <button class="speak-btn" onclick="speak('${safeText}')" 
                            style="background: #3B6FE0; color: white; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                        🔊
                    </button>
                </div>
            `;
        });
        html += `</div>`;
    }

    // 3. СЛОВАРЬ
    if (lesson.vocabulary && lesson.vocabulary.length) {
        html += `<h4 style="margin-top: 20px;">📚 Лексика к уроку:</h4><div class="vocab-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">`;
        lesson.vocabulary.forEach(word => {
            const safeText = word.de.replace(/'/g, "\\'");
            html += `
                <div class="vocab-item" style="background: #f8f9fa; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong style="color: #2E7D32;">${word.de}</strong> — ${word.ru}</span>
                    <button class="speak-btn" onclick="speak('${safeText}')" 
                            style="background: #3B6FE0; color: white; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.08s ease;">
                        🔊
                    </button>
                </div>
            `;
        });
        html += `</div>`;
    }

    // 4. УПРАЖНЕНИЯ
    if (lesson.practice && lesson.practice.length) {
        html += `<h4 style="margin-top: 20px;">✍️ Упражнения (вставьте слово):</h4>`;
        
        // Инициализируем состояние подсказок для этого урока
        grammarHintStates = {};
        
        lesson.practice.forEach((ex, index) => {
            grammarHintStates[index] = 0;
            const answerWords = ex.answer.split(/\s+/);
            
            html += `
                <div class="practice-item" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;" id="practice-item-${index}">
                    <div><strong>${index + 1}.</strong> ${ex.question}</div>
                    <div style="margin: 8px 0;">${ex.sentence}</div>
                    <input type="text" class="practice-input" data-index="${index}" 
                           placeholder="Введите ответ..." autocomplete="off"
                           style="width: 100%; padding: 10px; border: 2px solid #D0D0D0; border-radius: 8px; font-size: 16px; box-sizing: border-box; margin: 8px 0;">
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 4px 0 8px 0;">
                        <button class="check-btn" data-index="${index}" 
                                style="padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; white-space: nowrap; transition: all 0.08s ease;">
                            ПРОВЕРИТЬ
                        </button>
                        <button class="hint-btn" data-index="${index}" 
                                style="padding: 8px 20px; background: #E8F0FE; color: #333; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold; white-space: nowrap; transition: all 0.08s ease;">
                            💡 ПОДСКАЗКА
                        </button>
                        <span class="hint-display" data-index="${index}" 
                              style="font-size: 14px; color: #666; font-style: italic; white-space: nowrap;">
                            💡 Нажмите "Подсказка", чтобы добавить следующее слово
                        </span>
                    </div>
                    
                    <div class="practice-result" data-index="${index}" style="margin-top: 4px;"></div>
                </div>
            `;
        });
    }

    container.innerHTML = html;

    // ===== ЛОГИКА ПРОВЕРКИ УПРАЖНЕНИЙ =====
    container.querySelectorAll('.check-btn[data-index]').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const input = container.querySelector(`.practice-input[data-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-index="${index}"]`);
            const exercise = lesson.practice[index];

            if (!input || !result) return;
            
            function normalizeAnswer(text) {
                return text.trim().toLowerCase().replace(/\s+/g, ' ');
            }

            const userAnswer = normalizeAnswer(input.value);
            const correctAnswer = normalizeAnswer(exercise.answer);

            if (userAnswer === correctAnswer) {
                result.innerHTML = '✅ Правильно!';
                result.className = 'practice-result result-correct';
                result.style.color = '#4CAF50';
                input.style.borderColor = '#4CAF50';
                input.style.backgroundColor = '#E8F5E9';
                input.disabled = true;
                this.disabled = true;
                this.style.opacity = '0.5';
                
                // Блокируем кнопку подсказки
                const hintBtn = container.querySelector(`.hint-btn[data-index="${index}"]`);
                if (hintBtn) {
                    hintBtn.disabled = true;
                    hintBtn.style.opacity = '0.5';
                    hintBtn.style.cursor = 'not-allowed';
                }
                
                const hintDisplay = container.querySelector(`.hint-display[data-index="${index}"]`);
                if (hintDisplay) {
                    hintDisplay.textContent = '✅ Выполнено!';
                    hintDisplay.style.color = '#4CAF50';
                }
            } else {
                result.innerHTML = '❌ Неправильно. Попробуйте ещё раз!';
                result.className = 'practice-result result-wrong';
                result.style.color = '#F44336';
                input.style.borderColor = '#F44336';
                input.style.backgroundColor = '#FFEBEE';
                setTimeout(() => {
                    input.value = '';
                    input.style.borderColor = '#D0D0D0';
                    input.style.backgroundColor = '';
                    result.innerHTML = '';
                    // Сбрасываем состояние подсказок для этого упражнения
                    grammarHintStates[index] = 0;
                    const hintDisplay = container.querySelector(`.hint-display[data-index="${index}"]`);
                    if (hintDisplay) {
                        hintDisplay.textContent = '💡 Нажмите "Подсказка", чтобы добавить следующее слово';
                        hintDisplay.style.color = '#666';
                    }
                    const hintBtn = container.querySelector(`.hint-btn[data-index="${index}"]`);
                    if (hintBtn) {
                        hintBtn.disabled = false;
                        hintBtn.style.opacity = '1';
                        hintBtn.style.cursor = 'pointer';
                        hintBtn.style.background = '#E8F0FE';
                        hintBtn.style.border = '2px solid #D0D0D0';
                        hintBtn.style.color = '#333';
                    }
                    input.focus();
                }, 500);
            }
        });
    });

    // ===== ЛОГИКА ПОДСКАЗКИ (как в Диктанте) =====
    container.querySelectorAll('.hint-btn[data-index]').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const input = container.querySelector(`.practice-input[data-index="${index}"]`);
            const hintDisplay = container.querySelector(`.hint-display[data-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-index="${index}"]`);
            const exercise = lesson.practice[index];
            
            if (!input || !hintDisplay) return;
            
            if (input.disabled) {
                hintDisplay.textContent = '✅ Упражнение уже выполнено!';
                hintDisplay.style.color = '#4CAF50';
                return;
            }
            
            if (result) {
                result.innerHTML = '';
                result.className = 'practice-result';
            }
            
            const answerWords = exercise.answer.split(/\s+/);
            
            // Проверяем, сколько слов уже введено правильно
            let currentWords = input.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            let matchedWords = 0;
            for (let i = 0; i < Math.min(currentWords.length, answerWords.length); i++) {
                const currentWord = currentWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
                const correctWord = answerWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
                if (currentWord === correctWord) {
                    matchedWords++;
                } else {
                    break;
                }
            }
            
            if (matchedWords === answerWords.length) {
                hintDisplay.textContent = '✅ Вы уже ввели все слова! Нажмите "Проверить".';
                hintDisplay.style.color = '#4CAF50';
                return;
            }
            
            let hintCount = Math.max(matchedWords, grammarHintStates[index] || 0);
            
            if (hintCount >= answerWords.length) {
                hintDisplay.textContent = '💡 Показан полный ответ! Нажмите "Проверить".';
                hintDisplay.style.color = '#FF9800';
                this.disabled = true;
                this.style.opacity = '0.5';
                this.style.cursor = 'not-allowed';
                return;
            }
            
            hintCount++;
            grammarHintStates[index] = hintCount;
            
            const hintWords = answerWords.slice(0, hintCount);
            const hintText = hintWords.join(' ');
            
            const userWords = input.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            let userMatches = true;
            for (let i = 0; i < Math.min(userWords.length, answerWords.length); i++) {
                const userWord = userWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
                const correctWord = answerWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
                if (userWord !== correctWord) {
                    userMatches = false;
                    break;
                }
            }
            
            if (userMatches && userWords.length > 0 && userWords.length < answerWords.length) {
                const remainingWords = answerWords.slice(userWords.length, hintCount);
                input.value = userWords.join(' ') + ' ' + remainingWords.join(' ');
            } else {
                input.value = hintText;
            }
            
            const remaining = answerWords.length - hintCount;
            hintDisplay.textContent = `💡 Показано ${hintCount} из ${answerWords.length} слов. Осталось: ${remaining}`;
            hintDisplay.style.color = '#FF9800';
            
            input.style.borderColor = '#FF9800';
            input.style.backgroundColor = '#FFF3E0';
            
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        });
    });

    // ===== ОБРАБОТКА ВВОДА В ПОЛЯ =====
    container.querySelectorAll('.practice-input[data-index]').forEach(input => {
        input.addEventListener('input', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const exercise = lesson.practice[index];
            const answerWords = exercise.answer.split(/\s+/);
            
            if (!this.disabled) {
                this.style.borderColor = '#D0D0D0';
                this.style.backgroundColor = '';
                
                const userWords = this.value.trim().split(/\s+/).filter(w => w.length > 0);
                let matchedWords = 0;
                for (let i = 0; i < Math.min(userWords.length, answerWords.length); i++) {
                    const userWord = userWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
                    const correctWord = answerWords[i].toLowerCase().replace(/[.,!?;:]/g, '');
                    if (userWord === correctWord) {
                        matchedWords++;
                    } else {
                        break;
                    }
                }
                
                if (matchedWords > (grammarHintStates[index] || 0)) {
                    grammarHintStates[index] = matchedWords;
                }
                
                const hintDisplay = container.querySelector(`.hint-display[data-index="${index}"]`);
                if (hintDisplay && matchedWords < answerWords.length) {
                    const shown = grammarHintStates[index] || 0;
                    hintDisplay.textContent = `💡 Нажмите "Подсказка", чтобы добавить следующее слово (${shown}/${answerWords.length})`;
                    hintDisplay.style.color = '#666';
                }
            }
        });
    });

    // ===== ЭФФЕКТ НАЖАТИЯ ДЛЯ КНОПОК ОЗВУЧКИ =====
    container.querySelectorAll('.speak-btn').forEach(btn => {
        btn.addEventListener('mousedown', function(e) {
            this.style.transform = 'scale(0.92)';
            this.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('mouseup', function(e) {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('mouseleave', function(e) {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.92)';
            this.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
        });
        btn.addEventListener('touchend', function(e) {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        });
    });
}
