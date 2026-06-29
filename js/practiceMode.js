// ====================================================================
// practiceMode.js — Упражнения (вставка пропущенных слов)
// ====================================================================

function renderPractice(container, lesson) {
    const exercises = lesson.practice || [];
    
    if (!exercises || exercises.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">📭 Упражнений нет</div>';
        return;
    }

    let html = '<h3>✍️ Упражнения</h3>';
    exercises.forEach((ex, index) => {
        html += `
            <div class="practice-item" id="practice-item-${index}">
                <div><strong>${index + 1}.</strong> ${ex.question}</div>
                <div style="margin: 8px 0;">${ex.sentence}</div>
                <input type="text" class="practice-input" data-index="${index}" placeholder="Введите ответ..." autocomplete="off">
                <button class="check-btn" data-index="${index}">ПРОВЕРИТЬ</button>
                <div class="practice-result" data-index="${index}"></div>
                ${ex.hint ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">💡 Подсказка: ${ex.hint}</div>` : ''}
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
            
            function normalizeAnswer(text) {
                return text.trim().toLowerCase().replace(/\s+/g, ' ');
            }

            const userAnswer = normalizeAnswer(input.value);
            const correctAnswer = normalizeAnswer(exercise.answer);

            if (userAnswer === correctAnswer) {
                result.innerHTML = '✅ Правильно!';
                result.className = 'practice-result result-correct';
                input.style.borderColor = '#4CAF50';
                input.style.backgroundColor = '#E8F5E9';
                input.disabled = true;
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
        };
    });
}
