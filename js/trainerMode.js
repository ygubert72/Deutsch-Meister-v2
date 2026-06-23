// ====================================================================
// trainerMode.js — Тренажёр (составление предложений из слов)
// ====================================================================

let trainerSentences = [];
let trainerIndex = 0;
let trainerCurrentSentence = null;
let trainerSelectedWords = [];
let trainerAvailableWords = [];
let trainerActiveWords = {};
let trainerHintIndex = 0;
let trainerHintWords = [];
let trainerDirection = 'ru_to_de';

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

    // БЕРЁМ ОТДЕЛЬНЫЕ СЛОВА, а не целые фразы
    // Перемешиваем слова и группируем по 3-4 слова
    const shuffledVocab = [...vocab];
    for (let i = shuffledVocab.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledVocab[i], shuffledVocab[j]] = [shuffledVocab[j], shuffledVocab[i]];
    }

    trainerSentences = [];
    const wordsPerSentence = 3;
    for (let i = 0; i < shuffledVocab.length && trainerSentences.length < 10; i += wordsPerSentence) {
        const chunk = shuffledVocab.slice(i, i + wordsPerSentence);
        if (chunk.length === wordsPerSentence) {
            // Перемешиваем слова внутри предложения
            const shuffledChunk = [...chunk];
            for (let j = shuffledChunk.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [shuffledChunk[j], shuffledChunk[k]] = [shuffledChunk[k], shuffledChunk[j]];
            }
            trainerSentences.push({
                original: chunk,
                shuffled: shuffledChunk
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
    trainerDirection = 'ru_to_de';
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

    const isRuToDe = trainerDirection === 'ru_to_de';
    const questionText = isRuToDe 
        ? trainerCurrentSentence.original.map(w => w.ru).join(' ')
        : trainerCurrentSentence.original.map(w => w.de).join(' ');

    let html = `
        <div style="text-align: center;">
            <button class="dir-btn" id="trainerDirBtn" style="background: #3B6FE0; color: white; padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 15px;">
                ${isRuToDe ? '🇷🇺→🇩🇪' : '🇩🇪→🇷🇺'}
            </button>
            <div style="background: #E8F0FE; border-radius: 20px; padding: 20px; margin-bottom: 15px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Составьте предложение на немецком:</div>
                <div style="font-size: 20px; font-weight: bold;">${questionText}</div>
            </div>
            <div style="background: #FFFFFF; border: 2px solid #E0E0E0; border-radius: 16px; padding: 15px; margin: 10px 0; text-align: center; font-weight: bold; font-size: 20px; min-height: 60px; color: #1A1A1A;" id="trainerResult">
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

    document.getElementById('trainerDirBtn').onclick = function() {
        trainerDirection = trainerDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
        this.textContent = trainerDirection === 'ru_to_de' ? '🇷🇺→🇩🇪' : '🇩🇪→🇷🇺';
        showTrainerSentence(container);
    };

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
