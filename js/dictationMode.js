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
        hintStates[index] = 0; // 0 показанных слов
        const deWords = s.de.split(/\s+/);
        
        html += `
            <div class="dictation-item" id="dictation-item-${index}">
                <div><strong>${index + 1}.</strong> ${s.ru}</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    <input type="text" class="practice-input" data-dict-index="${index}" 
                           placeholder="Введите перевод..." autocomplete="off" 
                           style="flex: 1; min-width: 200px;">
                    <button class="check-btn" data-dict-index="${index}">ПРОВЕРИТЬ</button>
                    <button class="hint-btn" data-dict-index="${index}" 
                            style="padding: 8px 16px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        💡 ПОДСКАЗКА
                    </button>
                </div>
                <div class="practice-result" data-dict-index="${index}"></div>
                <div class="hint-display" data-dict-index="${index}" 
                     style="margin-top: 8px; font-size: 14px; color: #666; min-height: 24px; font-style: italic;">
                    💡 Нажмите "Подсказка", чтобы добавить следующее слово
                </div>
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
            
            // Если предложение уже правильно введено, не даем подсказки
            if (input.disabled) {
                hintDisplay.textContent = '✅ Предложение уже введено верно!';
                hintDisplay.style.color = '#4CAF50';
                return;
            }
            
            // Очищаем сообщение об ошибке, если оно было
            if (result) {
                result.innerHTML = '';
                result.className = 'practice-result';
            }
            
            const deWords = sentence.de.split(/\s+/);
            
            // Проверяем, сколько слов уже показано
            // Сравниваем текущий ввод с правильным предложением по словам
            let currentWords = input.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            // Считаем, сколько слов из начала предложения уже введено правильно
            let matchedWords = 0;
            for (let i = 0; i < Math.min(currentWords.length, deWords.length); i++) {
                // Нормализуем оба слова для сравнения (убираем знаки препинания)
                const currentWord = currentWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                const correctWord = deWords[i].replace(/[.,!?;:]/g, '').toLowerCase();
                if (currentWord === correctWord) {
                    matchedWords++;
                } else {
                    break;
                }
            }
            
            // Если пользователь уже ввел все слова правильно, но не нажал "Проверить"
            if (matchedWords === deWords.length) {
                hintDisplay.textContent = '✅ Вы уже ввели все слова! Нажмите "Проверить".';
                hintDisplay.style.color = '#4CAF50';
                return;
            }
            
            // Определяем, сколько слов уже показано подсказками
            // Берем максимум из: количество совпавших слов + 1 (если подсказок еще не было)
            let hintCount = Math.max(matchedWords, hintStates[index] || 0);
            
            // Если все слова уже показаны
            if (hintCount >= deWords.length) {
                hintDisplay.textContent = '💡 Показано всё предложение!';
                hintDisplay.style.color = '#FF9800';
                this.disabled = true;
                this.style.opacity = '0.5';
                this.style.cursor = 'not-allowed';
                return;
            }
            
            // Добавляем следующее слово к подсказке
            hintCount++;
            hintStates[index] = hintCount;
            
            // Формируем подсказку: правильные слова из начала предложения
            const hintWords = deWords.slice(0, hintCount);
            const hintText = hintWords.join(' ');
            
            // Если пользователь уже что-то ввел, но не совпадает с началом предложения,
            // мы все равно заменяем его ввод на подсказку (чтобы не было каши)
            // Но если пользователь ввел что-то свое, а потом попросил подсказку,
            // мы добавляем следующее слово к тому, что он уже ввел
            const userWords = input.value.trim().split(/\s+/).filter(w => w.length > 0);
            
            // Проверяем, совпадает ли ввод пользователя с началом правильного предложения
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
                // Если пользователь уже начал вводить правильно, добавляем следующее слово
                const remainingWords = deWords.slice(userWords.length, hintCount);
                input.value = userWords.join(' ') + ' ' + remainingWords.join(' ');
            } else {
                // Иначе показываем подсказку с самого начала
                input.value = hintText;
            }
            
            // Обновляем отображение подсказки
            const remaining = deWords.length - hintCount;
            hintDisplay.textContent = `💡 Показано ${hintCount} из ${deWords.length} слов. Осталось: ${remaining}`;
            hintDisplay.style.color = '#FF9800';
            
            // Подсвечиваем поле ввода
            input.style.borderColor = '#FF9800';
            input.style.backgroundColor = '#FFF3E0';
            
            // Фокусируем поле ввода, чтобы пользователь мог сразу продолжить ввод
            input.focus();
            // Ставим курсор в конец поля
            input.setSelectionRange(input.value.length, input.value.length);
        };
    });

    // ===== ОБРАБОТЧИК ДЛЯ ИЗМЕНЕНИЙ В ПОЛЕ ВВОДА =====
    container.querySelectorAll('.practice-input[data-dict-index]').forEach(input => {
        input.addEventListener('input', function() {
            const index = parseInt(this.getAttribute('data-dict-index'));
            const sentence = sentences[index];
            const deWords = sentence.de.split(/\s+/);
            
            // Если поле не disabled
            if (!this.disabled) {
                // Сбрасываем подсветку, если пользователь начал вводить сам
                this.style.borderColor = '#D0D0D0';
                this.style.backgroundColor = '';
                
                // Проверяем, сколько слов пользователь уже ввел правильно
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
                
                // Обновляем счетчик подсказок, если пользователь ввел больше слов, чем было показано
                if (matchedWords > (hintStates[index] || 0)) {
                    hintStates[index] = matchedWords;
                }
                
                // Обновляем отображение подсказки
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
