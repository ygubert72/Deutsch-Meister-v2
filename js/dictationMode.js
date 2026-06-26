// ====================================================================
// dictationMode.js — Диктант (правописание) с подсказками
// ====================================================================

function renderDictation(container, lesson) {
    const sentences = lesson.dictation || [];
    if (sentences.length === 0) {
        container.innerHTML = '<div>Нет предложений для диктанта</div>';
        return;
    }

    let html = '<h3>✏️ Правописание</h3><p>Напишите перевод на немецком языке:</p>';
    
    // Хранилище состояния подсказок для каждого предложения
    const hintStates = {};
    
    sentences.forEach((s, index) => {
        hintStates[index] = 0;
        const deWords = s.de.split(/\s+/);
        
        html += `
            <div class="dictation-item" id="dictation-item-${index}">
                <div><strong>${index + 1}.</strong> ${s.ru}</div>
                
                <!-- Поле ввода (на всю ширину) -->
                <input type="text" class="practice-input" data-dict-index="${index}" 
                       placeholder="Введите перевод..." autocomplete="off" 
                       style="width: 100%; padding: 10px; border: 2px solid #D0D0D0; border-radius: 8px; font-size: 16px; box-sizing: border-box; margin: 8px 0;">
                
                <!-- Кнопки + текст подсказки в одну строку -->
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 4px 0 8px 0;">
                    <button class="check-btn" data-dict-index="${index}" 
                            style="padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                        ПРОВЕРИТЬ
                    </button>
                    
                    <button class="hint-btn" data-dict-index="${index}" 
                            style="padding: 8px 20px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                        💡 ПОДСКАЗКА
                    </button>
                    
                    <span class="hint-display" data-dict-index="${index}" 
                          style="font-size: 14px; color: #666; font-style: italic; white-space: nowrap;">
                        💡 Нажмите "Подсказка", чтобы добавить следующее слово
                    </span>
                </div>
                
                <!-- Результат проверки -->
                <div class="practice-result" data-dict-index="${index}" style="margin-top: 4px;"></div>
            </div>
        `;
    });
    container.innerHTML = html;

    // ===== ОБРАБОТЧИК ДЛЯ КНОПКИ "ПРОВЕРИТЬ" =====
    container.querySelectorAll('.check-btn[data-dict-index]').forEach(btn => {
        btn.onclick = function() {
            const index = parseInt(this.getAttribute('data-dict-index'));
            const input = container.querySelector(`.practice-input[data-dict-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-dict-index="${index}"]`);
            const sentence = sentences[index];

            if (!input || !result) return;
            
            function normalizeAnswer(text) {
                return text
                    .trim()
                    .replace(/,/g, '')
                    .replace(/\.$/, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            const userAnswer = normalizeAnswer(input.value);
            const correctAnswer = normalizeAnswer(sentence.de);

            if (userAnswer === correctAnswer) {
                result.innerHTML = '✅ Правильно!';
                result.className = 'practice-result result-correct';
                input.style.borderColor = '#4CAF50';
                input.style.backgroundColor = '#E8F5E9';
                input.disabled = true;
                
                const hintBtn = container.querySelector(`.hint-btn[data-dict-index="${index}"]`);
                if (hintBtn) {
                    hintBtn.disabled = true;
                    hintBtn.style.opacity = '0.5';
                    hintBtn.style.cursor = 'not-allowed';
                }
                
                const hintDisplay = container.querySelector(`.hint-display[data-dict-index="${index}"]`);
                if (hintDisplay) {
                    hintDisplay.textContent = '✅ Предложение введено верно!';
                    hintDisplay.style.color = '#4CAF50';
                }
            } else {
                result.innerHTML = '❌ Неправильно. Попробуйте ещё раз!';
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
                input.style.backgroundColor = '#FFEBEE';
            }
        };
    });

    // ===== ОБРАБОТЧИК ДЛЯ КНОПКИ "ПОДСКАЗКА" =====
    container.querySelectorAll('.hint-btn[data-dict-index]').forEach(btn => {
        btn.onclick = function() {
            const index = parseInt(this.getAttribute('data-dict-index'));
            const input = container.querySelector(`.practice-input[data-dict-index="${index}"]`);
            const hintDisplay = container.querySelector(`.hint-display[data-dict-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-dict-index="${index}"]`);
            const sentence = sentences[index];
            
            if (!input || !hintDisplay) return;
            
            if (input.disabled) {
                hintDisplay.textContent = '✅ Предложение уже введено верно!';
                hintDisplay.style.color = '#4CAF50';
                return;
            }
            
            if (result) {
                result.innerHTML = '';
                result.className = 'practice-result';
            }
            
            const deWords = sentence.de.split(/\s+/);
            
            let currentWords = input.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            let matchedWords = 0;
            for (let i = 0; i < Math.min(currentWords.length, deWords.length); i++) {
                const currentWord = currentWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                const correctWord = deWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                if (currentWord === correctWord) {
                    matchedWords++;
                } else {
                    break;
                }
            }
            
            if (matchedWords === deWords.length) {
                hintDisplay.textContent = '✅ Вы уже ввели все слова! Нажмите "Проверить".';
                hintDisplay.style.color = '#4CAF50';
                return;
            }
            
            let hintCount = Math.max(matchedWords, hintStates[index] || 0);
            
            if (hintCount >= deWords.length) {
                hintDisplay.textContent = '💡 Показано всё предложение! Нажмите "Проверить".';
                hintDisplay.style.color = '#FF9800';
                this.disabled = true;
                this.style.opacity = '0.5';
                this.style.cursor = 'not-allowed';
                return;
            }
            
            hintCount++;
            hintStates[index] = hintCount;
            
            const hintWords = deWords.slice(0, hintCount);
            const hintText = hintWords.join(' ');
            
            const userWords = input.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            let userMatches = true;
            for (let i = 0; i < Math.min(userWords.length, deWords.length); i++) {
                const userWord = userWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                const correctWord = deWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                if (userWord !== correctWord) {
                    userMatches = false;
                    break;
                }
            }
            
            if (userMatches && userWords.length > 0 && userWords.length < deWords.length) {
                const remainingWords = deWords.slice(userWords.length, hintCount);
                input.value = userWords.join(' ') + ' ' + remainingWords.join(' ');
            } else {
                input.value = hintText;
            }
            
            const remaining = deWords.length - hintCount;
            hintDisplay.textContent = `💡 Показано ${hintCount} из ${deWords.length} слов. Осталось: ${remaining}`;
            hintDisplay.style.color = '#FF9800';
            
            input.style.borderColor = '#FF9800';
            input.style.backgroundColor = '#FFF3E0';
            
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        };
    });

    // ===== ОБРАБОТЧИК ДЛЯ ИЗМЕНЕНИЙ В ПОЛЕ ВВОДА =====
    container.querySelectorAll('.practice-input[data-dict-index]').forEach(input => {
        input.addEventListener('input', function() {
            const index = parseInt(this.getAttribute('data-dict-index'));
            const sentence = sentences[index];
            const deWords = sentence.de.split(/\s+/);
            
            if (!this.disabled) {
                this.style.borderColor = '#D0D0D0';
                this.style.backgroundColor = '';
                
                const userWords = this.value.trim().split(/\s+/).filter(w => w.length > 0);
                let matchedWords = 0;
                for (let i = 0; i < Math.min(userWords.length, deWords.length); i++) {
                    const userWord = userWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                    const correctWord = deWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                    if (userWord === correctWord) {
                        matchedWords++;
                    } else {
                        break;
                    }
                }
                
                if (matchedWords > (hintStates[index] || 0)) {
                    hintStates[index] = matchedWords;
                }
                
                const hintDisplay = container.querySelector(`.hint-display[data-dict-index="${index}"]`);
                if (hintDisplay && matchedWords < deWords.length) {
                    const shown = hintStates[index] || 0;
                    hintDisplay.textContent = `💡 Нажмите "Подсказка", чтобы добавить следующее слово (${shown}/${deWords.length})`;
                    hintDisplay.style.color = '#666';
                }
            }
        });
    });
}
