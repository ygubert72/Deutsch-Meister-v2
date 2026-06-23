// ====================================================================
// dictationMode.js — Диктант (правописание)
// ====================================================================

function renderDictation(container, lesson) {
    const sentences = lesson.dictation || [];
    if (sentences.length === 0) {
        container.innerHTML = '<div>Нет предложений для диктанта</div>';
        return;
    }

    let html = '<h3>✏️ Правописание</h3><p>Напишите перевод на немецком языке:</p>';
    sentences.forEach((s, index) => {
        html += `
            <div class="dictation-item" id="dictation-item-${index}">
                <div><strong>${index + 1}.</strong> ${s.ru}</div>
                <input type="text" class="practice-input" data-dict-index="${index}" placeholder="Введите перевод..." autocomplete="off">
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
            
            // Нормализуем ответ: убираем запятые, точки, лишние пробелы
            // но сохраняем заглавные буквы (важно для немецких существительных)
            function normalizeAnswer(text) {
                return text
                    .trim()
                    .replace(/,/g, '')        // убираем запятые
                    .replace(/\.$/, '')       // убираем точку в конце
                    .replace(/\s+/g, ' ')     // нормализуем пробелы
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
