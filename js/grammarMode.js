// ====================================================================
// grammarMode.js — Грамматика (теория + примеры + словарь + упражнения)
// ====================================================================

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
                            style="background: #3B6FE0; color: white; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
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
                            style="background: #3B6FE0; color: white; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
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
        lesson.practice.forEach((ex, index) => {
            html += `
                <div class="practice-item" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <div><strong>${index + 1}.</strong> ${ex.question}</div>
                    <div style="margin: 8px 0;">${ex.sentence}</div>
                    <input type="text" class="practice-input" data-index="${index}" 
                           placeholder="Введите ответ..." autocomplete="off"
                           style="width: 100%; padding: 10px; border: 2px solid #D0D0D0; border-radius: 8px; font-size: 16px; box-sizing: border-box; margin: 8px 0;">
                    <button class="check-btn" data-index="${index}" 
                            style="padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        ПРОВЕРИТЬ
                    </button>
                    <div class="practice-result" data-index="${index}" style="margin-top: 4px;"></div>
                    ${ex.hint ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">💡 ${ex.hint}</div>` : ''}
                </div>
            `;
        });
    }

    container.innerHTML = html;

    // ===== ЛОГИКА ПРОВЕРКИ УПРАЖНЕНИЙ (прямо внутри грамматики) =====
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
                    input.focus();
                }, 400);
            }
        });
    });
}
