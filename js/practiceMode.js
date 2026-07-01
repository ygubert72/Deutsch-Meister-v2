// ====================================================================
// practiceMode.js — Упражнения (вставка пропущенных слов) с сохранением прогресса
// ====================================================================

let practiceCompleted = {};
let practiceCurrentLessonId = null;

function renderPractice(container, lesson) {
    const lessonId = lesson.id || 1;
    practiceCurrentLessonId = lessonId;
    
    loadPracticeProgress(lessonId);
    
    const exercises = lesson.practice || [];
    
    if (!exercises || exercises.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📭 Упражнений нет</div>';
        return;
    }

    let completedCount = Object.values(practiceCompleted).filter(v => v === true).length;
    const total = exercises.length;
    const allCompleted = completedCount === total;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
            <div>
                <h3 style="margin: 0;">✍️ Упражнения</h3>
                <div style="font-size: 14px; color: #666; margin-top: 4px;">
                    📊 Прогресс: ${completedCount} из ${total} упражнений выполнено
                    ${allCompleted ? ' 🎉 Все выполнено!' : ''}
                </div>
            </div>
            ${completedCount > 0 ? `
                <button id="resetPracticeBtn" style="padding: 8px 20px; background: #F44336; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                    🔄 СБРОСИТЬ ПРОГРЕСС
                </button>
            ` : ''}
        </div>
    `;

    exercises.forEach((ex, index) => {
        const isCompleted = practiceCompleted[index] === true;
        const completedStyle = isCompleted ? 'opacity: 0.7; background: #E8F5E9; border-radius: 8px; padding: 10px;' : '';
        const inputDisabled = isCompleted ? 'disabled' : '';
        const inputStyle = isCompleted 
            ? 'border-color: #4CAF50; background-color: #E8F5E9; color: #2E7D32;' 
            : '';

        html += `
            <div class="practice-item" id="practice-item-${index}" style="${completedStyle}">
                <div><strong>${index + 1}.</strong> ${ex.question}</div>
                <div style="margin: 8px 0;">${ex.sentence}</div>
                <input type="text" class="practice-input" data-index="${index}" 
                       placeholder="Введите ответ..." autocomplete="off"
                       value="${isCompleted ? ex.answer : ''}"
                       ${inputDisabled}
                       style="width: 100%; padding: 10px; border: 2px solid ${isCompleted ? '#4CAF50' : '#D0D0D0'}; border-radius: 8px; font-size: 16px; box-sizing: border-box; margin: 8px 0; ${inputStyle}">
                <button class="check-btn" data-index="${index}" 
                        ${isCompleted ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                        style="padding: 8px 20px; background: ${isCompleted ? '#9E9E9E' : '#3B6FE0'}; color: white; border: none; border-radius: 8px; cursor: ${isCompleted ? 'not-allowed' : 'pointer'}; font-weight: bold; white-space: nowrap;">
                    ПРОВЕРИТЬ
                </button>
                <div class="practice-result" data-index="${index}" style="margin-top: 4px;">
                    ${isCompleted ? '<span style="color: #4CAF50; font-weight: bold;">✅ Правильно!</span>' : ''}
                </div>
                ${ex.hint ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">💡 ${ex.hint}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // ===== КНОПКА СБРОСА =====
    const resetBtn = document.getElementById('resetPracticeBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (!confirm('Вы уверены, что хотите сбросить весь прогресс в упражнениях?')) return;
            practiceCompleted = {};
            savePracticeProgress(practiceCurrentLessonId);
            renderPractice(container, lesson);
        });
    }

    // ===== ПРОВЕРКА =====
    container.querySelectorAll('.check-btn[data-index]').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const input = container.querySelector(`.practice-input[data-index="${index}"]`);
            const result = container.querySelector(`.practice-result[data-index="${index}"]`);
            const exercise = exercises[index];

            if (!input || !result) return;
            
            function normalizeAnswer(text) {
                return text.trim().toLowerCase().replace(/\s+/g, ' ');
            }

            const userAnswer = normalizeAnswer(input.value);
            const correctAnswer = normalizeAnswer(exercise.answer);

            if (userAnswer === correctAnswer) {
                practiceCompleted[index] = true;
                savePracticeProgress(practiceCurrentLessonId);
                
                result.innerHTML = '✅ Правильно!';
                result.className = 'practice-result result-correct';
                input.style.borderColor = '#4CAF50';
                input.style.backgroundColor = '#E8F5E9';
                input.disabled = true;
                
                setTimeout(() => {
                    renderPractice(container, lesson);
                }, 500);
            } else {
                result.innerHTML = '❌ Неправильно. Попробуйте ещё раз!';
                result.className = 'practice-result result-wrong';
                input.style.borderColor = '#F44336';
                input.style.backgroundColor = '#FFEBEE';
                setTimeout(() => {
                    input.value = '';
                    input.style.borderColor = '#D0D0D0';
                    input.style.backgroundColor = '';
                    result.innerHTML = '';
                    input.focus();
                }, 500);
            }
        });
    });
}

// ===== СОХРАНЕНИЕ ПРОГРЕССА =====
function savePracticeProgress(lessonId) {
    try {
        localStorage.setItem('dm_practice_progress_' + lessonId, JSON.stringify(practiceCompleted));
    } catch(e) {
        console.warn('Ошибка сохранения прогресса упражнений:', e);
    }
}

function loadPracticeProgress(lessonId) {
    try {
        const saved = localStorage.getItem('dm_practice_progress_' + lessonId);
        if (saved) {
            practiceCompleted = JSON.parse(saved);
        } else {
            practiceCompleted = {};
        }
    } catch(e) {
        practiceCompleted = {};
    }
}
