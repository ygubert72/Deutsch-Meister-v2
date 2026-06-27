// ====================================================================
// dictationMode.js — Диктант (правописание) с подсказками и сохранением прогресса
// ====================================================================

let dictationCurrentLessonId = null;
let dictationCompleted = {};

// ===== НОВАЯ ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ДИКТАНТА =====
async function loadDictationData(lesson) {
    // Если диктант уже есть — возвращаем
    if (lesson.dictation && lesson.dictation.length > 0) {
        return lesson.dictation;
    }
    
    // Пробуем загрузить из отдельного файла
    if (lesson.id) {
        try {
            const paddedId = String(lesson.id).padStart(2, '0');
            const response = await fetch(`docs/course/${currentLevel}/dictation/dictation_${paddedId}.json`);
            if (response.ok) {
                const data = await response.json();
                lesson.dictation = data;
                console.log(`✅ Диктант урока ${lesson.id} загружен из отдельного файла`);
                return data;
            }
        } catch(e) {
            console.log(`ℹ️ Отдельный файл диктанта для урока ${lesson.id} не найден`);
        }
    }
    
    return [];
}

async function renderDictation(container, lesson) {
    const lessonId = lesson.id || 1;
    dictationCurrentLessonId = lessonId;
    
    loadDictationProgress(lessonId);
    
    // Показываем загрузку
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">⏳ Загрузка диктанта...</div>';
    
    // Загружаем диктант
    let sentences = await loadDictationData(lesson);
    
    if (!sentences || sentences.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📭 Нет предложений для диктанта</div>';
        return;
    }

    // ===== ВСЁ, ЧТО НИЖЕ — ОРИГИНАЛЬНЫЙ КОД БЕЗ ИЗМЕНЕНИЙ =====

    let completedCount = Object.values(dictationCompleted).filter(v => v === true).length;
    const total = sentences.length;
    const allCompleted = completedCount === total;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
            <div>
                <h3 style="margin: 0;">✏️ Правописание</h3>
                <div style="font-size: 14px; color: #666; margin-top: 4px;">
                    📊 Прогресс: ${completedCount} из ${total} предложений выполнено
                    ${allCompleted ? ' 🎉 Все выполнено!' : ''}
                </div>
            </div>
            ${completedCount > 0 ? `
                <button id="resetDictationBtn" style="padding: 8px 20px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                    🔄 СБРОСИТЬ ПРОГРЕСС
                </button>
            ` : ''}
        </div>
        <p>Напишите перевод на немецком языке:</p>
    `;
    
    const hintStates = {};
    
    sentences.forEach((s, index) => {
        const isCompleted = dictationCompleted[index] === true;
        
        hintStates[index] = 0;
        const deWords = s.de.split(/\s+/);
        
        const completedStyle = isCompleted ? 'opacity: 0.7; background: #E8F5E9; border-radius: 8px; padding: 10px;' : '';
        const inputDisabled = isCompleted ? 'disabled' : '';
        const inputStyle = isCompleted 
            ? 'border-color: #4CAF50; background-color: #E8F5E9; color: #2E7D32;' 
            : '';
        
        html += `
            <div class="dictation-item" id="dictation-item-${index}" style="${completedStyle}">
                <div><strong>${index + 1}.</strong> ${s.ru}</div>
                
                <input type="text" class="practice-input" data-dict-index="${index}" 
                       placeholder="Введите перевод..." autocomplete="off" 
                       value="${isCompleted ? s.de : ''}"
                       ${inputDisabled}
                       style="width: 100%; padding: 10px; border: 2px solid ${isCompleted ? '#4CAF50' : '#D0D0D0'}; border-radius: 8px; font-size: 16px; box-sizing: border-box; margin: 8px 0; ${inputStyle}">
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 4px 0 8px 0;">
                    <button class="check-btn" data-dict-index="${index}" 
                            ${isCompleted ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                            style="padding: 8px 20px; background: ${isCompleted ? '#9E9E9E' : '#3B6FE0'}; color: white; border: none; border-radius: 8px; cursor: ${isCompleted ? 'not-allowed' : 'pointer'}; font-weight: bold; white-space: nowrap;">
                        ПРОВЕРИТЬ
                    </button>
                    
                    <!-- КНОПКА ПОДСКАЗКА - СВЕТЛО-ГОЛУБАЯ -->
                    <button class="hint-btn" data-dict-index="${index}" 
                            ${isCompleted ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                            style="padding: 8px 20px; background: ${isCompleted ? '#E0E0E0' : '#E8F0FE'}; color: ${isCompleted ? '#999' : '#333'}; border: ${isCompleted ? 'none' : '2px solid #D0D0D0'}; border-radius: 8px; cursor: ${isCompleted ? 'not-allowed' : 'pointer'}; font-weight: bold; white-space: nowrap;">
                        💡 ПОДСКАЗКА
                    </button>
                    
                    <span class="hint-display" data-dict-index="${index}" 
                          style="font-size: 14px; color: ${isCompleted ? '#4CAF50' : '#666'}; font-style: italic; white-space: nowrap;">
                        ${isCompleted ? '✅ Выполнено!' : '💡 Нажмите "Подсказка", чтобы добавить следующее слово'}
                    </span>
                </div>
                
                <div class="practice-result" data-dict-index="${index}" style="margin-top: 4px;">
                    ${isCompleted ? '<span style="color: #4CAF50; font-weight: bold;">✅ Правильно!</span>' : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    const resetBtn = document.getElementById('resetDictationBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (!confirm('Вы уверены, что хотите сбросить весь прогресс в диктанте?')) return;
            
            dictationCompleted = {};
            saveDictationProgress(dictationCurrentLessonId);
            renderDictation(container, lesson);
        });
    }

    container.querySelectorAll('.check-btn[data-dict-index]').forEach(btn => {
        btn.addEventListener('click', function() {
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
                dictationCompleted[index] = true;
                saveDictationProgress(dictationCurrentLessonId);
                
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
                    hintDisplay.textContent = '✅ Выполнено!';
                    hintDisplay.style.color = '#4CAF50';
                }
                
                setTimeout(() => {
                    renderDictation(container, lesson);
                }, 500);
                
            } else {
                result.innerHTML = '❌ Неправильно. Попробуйте ещё раз!';
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
                input.style.backgroundColor = '#FFEBEE';
            }
        });
    });

    container.querySelectorAll('.hint-btn[data-dict-index]').forEach(btn => {
        btn.addEventListener('click', function() {
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
        });
    });

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

function saveDictationProgress(lessonId) {
    try {
        localStorage.setItem('dm_dictation_progress_' + lessonId, JSON.stringify(dictationCompleted));
    } catch(e) {
        console.warn('Ошибка сохранения прогресса диктанта:', e);
    }
}

function loadDictationProgress(lessonId) {
    try {
        const saved = localStorage.getItem('dm_dictation_progress_' + lessonId);
        if (saved) {
            dictationCompleted = JSON.parse(saved);
        } else {
            dictationCompleted = {};
        }
    } catch(e) {
        dictationCompleted = {};
    }
}
