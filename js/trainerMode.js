// ====================================================================
// trainerMode.js — Тренажёр (составление предложений)
// ====================================================================

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerActiveWords = {};
let trainerHintIndex = 0;
let trainerHintWords = [];

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

    trainerSentences = [];
    for (let i = 0; i < Math.min(vocab.length, 20); i += 3) {
        if (i + 2 < vocab.length) {
            const words = [vocab[i], vocab[i+1], vocab[i+2]];
            const shuffled = [...words];
            for (let j = shuffled.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
            }
            trainerSentences.push({
                original: words,
                shuffled: shuffled
            });
        }
    }

    if (trainerSentences.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                <div>Не удалось создать предложения для тренажёра.</div>
                <div style="font-size: 14px; margin-top: 10px;">Попробуйте другой урок.</div>
            </div>
        `;
        return;
    }

    trainerIndex = 0;
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
    trainerSelectedWords = [];
    trainerAvailableWords = [...trainerCurrentSentence.shuffled];
    trainerActiveWords = {};
    trainerAvailableWords.forEach(w => { trainerActiveWords[w.de] = true; });
    trainerHintIndex = 0;
    trainerHintWords = trainerCurrentSentence.original.map(w => w.de);

    let html = `
        <div style="text-align: center;">
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Составьте предложение:</div>
                <div style="font-size: 18px; font-weight: bold;">${trainerCurrentSentence.original.map(w => w.ru).join(' ')}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-weight: bold; font-size: 18px; min-height: 60px;" id="trainerResult">
                ${trainerSelectedWords.join(' ') || 'Нажмите на слова, чтобы собрать предложение'}
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

    container.querySelectorAll('#trainerWordsContainer .word-btn').forEach(btn => {
        btn.onclick = function() {
            const word = this.getAttribute('data-word');
            if (trainerActiveWords[word]) {
                trainerActiveWords[word] = false;
                trainerSelectedWords.push(word);
                updateTrainerDisplay(container);
            }
        };
    });

    document.getElementById('trainerUndoBtn').onclick = function() {
        if (trainerSelectedWords.length > 0) {
            const lastWord = trainerSelectedWords.pop();
            trainerActiveWords[lastWord] = true;
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

        const correctAnswer = trainerCurrentSentence.original.map(w => w.de).join(' ');
        const userAnswer = trainerSelectedWords.join(' ');
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
            trainerSelectedWords.forEach(w => { trainerActiveWords[w] = true; });
            trainerSelectedWords = [];
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                updateTrainerDisplay(container);
            }, 500);
        }
    };

    document.getElementById('trainerSpeakBtn').onclick = function() {
        const text = trainerCurrentSentence.original.map(w => w.de).join(' ');
        speak(text);
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
        result.textContent = trainerSelectedWords.join(' ') || 'Нажмите на слова, чтобы собрать предложение';
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
                        trainerSelectedWords.push(word.de);
                        updateTrainerDisplay(container);
                    }
                };
                wordsContainer.appendChild(btn);
            }
        });
    }
}
