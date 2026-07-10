// ====================================================================
// listeningMode.js — Аудирование (Hörverstehen) — монологи
// ====================================================================

let listeningData = null;
let currentDialogIndex = 0;
let selectedAnswers = {};
let isTextVisible = false;
let isSpeaking = false;
let activeButton = null;
let currentSpeed = 0.85;
let currentUtterance = null;

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
function renderListening(container, lesson) {
    const lessonId = lesson.id || 1;
    const level = lesson.level || 'A1';
    
    const filePath = `docs/${level}/hoeren/${String(lessonId).padStart(2, '0')}_hoeren.json`;
    console.log('🎧 Загрузка аудирования:', filePath);
    
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Файл аудирования не найден');
            }
            return response.json();
        })
        .then(data => {
            listeningData = data;
            window.listeningData = data;
            currentDialogIndex = 0;
            selectedAnswers = {};
            isTextVisible = false;
            isSpeaking = false;
            activeButton = null;
            renderDialog(container);
        })
        .catch(error => {
            console.error('❌ Ошибка загрузки аудирования:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🎧</div>
                    <div>Раздел аудирования для этого урока пока не готов.</div>
                    <div style="font-size: 14px; margin-top: 10px;">Скоро появится!</div>
                </div>
            `;
        });
}

// ========== ОСТАНОВКА ОЗВУЧКИ ==========
function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    activeButton = null;
    currentUtterance = null;
    updateButtons();
}

// ========== ОЗВУЧИВАНИЕ ==========
function speakCurrentDialog(speed, buttonId) {
    if (isSpeaking && activeButton === buttonId) {
        stopSpeaking();
        return;
    }
    
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        activeButton = null;
    }
    
    if (!listeningData) {
        console.warn('⚠️ listeningData не загружен');
        return;
    }
    
    const dialogs = listeningData.dialogs;
    if (!dialogs || dialogs.length === 0) {
        console.warn('⚠️ Нет монологов');
        return;
    }
    
    const dialog = dialogs[currentDialogIndex];
    if (!dialog) {
        console.warn('⚠️ Монолог не найден, индекс:', currentDialogIndex);
        return;
    }
    
    const cleanText = dialog.text.trim();
    currentSpeed = speed;
    activeButton = buttonId;
    isSpeaking = true;
    
    console.log(`🎤 Озвучивание монолога: "${dialog.title}" | Скорость: ${currentSpeed}`);
    updateButtons();
    
    if (typeof window.speakWithSpeed === 'function') {
        const utterance = window.speakWithSpeed(cleanText, currentSpeed, function() {
            isSpeaking = false;
            activeButton = null;
            currentUtterance = null;
            updateButtons();
        });
        if (utterance) {
            currentUtterance = utterance;
        }
    } else if (typeof window.speak === 'function') {
        window.speak(cleanText);
        setTimeout(() => {
            isSpeaking = false;
            activeButton = null;
            updateButtons();
        }, 500);
    } else {
        console.warn('⚠️ Озвучка не доступна');
        isSpeaking = false;
        activeButton = null;
        updateButtons();
    }
}

// ========== ОБНОВЛЕНИЕ КНОПОК ==========
function updateButtons() {
    const listenBtn = document.getElementById('listenBtn');
    const slowBtn = document.getElementById('slowBtn');
    
    if (!listenBtn || !slowBtn) return;
    
    function resetButton(btn, label, isActive) {
        if (isActive) {
            btn.innerHTML = '⏹️ ОСТАНОВИТЬ';
            btn.style.background = '#3B6FE0';
            btn.style.color = 'white';
            btn.style.border = 'none';
        } else {
            btn.innerHTML = label;
            btn.style.background = '#E8F0FE';
            btn.style.color = '#333';
            btn.style.border = '2px solid #D0D0D0';
        }
    }
    
    const listenActive = isSpeaking && activeButton === 'listen';
    const slowActive = isSpeaking && activeButton === 'slow';
    
    resetButton(listenBtn, '🔊 ПРОСЛУШАТЬ', listenActive);
    resetButton(slowBtn, '🐢 МЕДЛЕННО', slowActive);
}

function speakNormal() {
    speakCurrentDialog(0.85, 'listen');
}

function speakSlow() {
    speakCurrentDialog(0.6, 'slow');
}

window._speakNormal = speakNormal;
window._speakSlow = speakSlow;
window._stopSpeaking = stopSpeaking;

// ========== ОТОБРАЖЕНИЕ МОНОЛОГА ==========
function renderDialog(container) {
    if (!listeningData || !listeningData.dialogs || listeningData.dialogs.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Нет монологов для этого урока</div>';
        return;
    }

    const dialogs = listeningData.dialogs;
    const dialog = dialogs[currentDialogIndex];
    const total = dialogs.length;

    function toggleText() {
        isTextVisible = !isTextVisible;
        renderDialog(container);
    }

    window._toggleText = toggleText;

    let html = `
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <h4 style="margin: 0;">🎧 ${dialog.title}</h4>
                <span style="font-size: 14px; color: #888;">${currentDialogIndex + 1} / ${total}</span>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0;">
                <button id="listenBtn" onclick="window._speakNormal()" style="padding: 8px 20px; background: #E8F0FE; color: #333; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🔊 ПРОСЛУШАТЬ
                </button>
                <button id="slowBtn" onclick="window._speakSlow()" style="padding: 8px 20px; background: #E8F0FE; color: #333; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🐢 МЕДЛЕННО
                </button>
                <button id="toggleTextBtn" onclick="window._toggleText()" style="padding: 8px 20px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ${isTextVisible ? '🙈 СКРЫТЬ ТЕКСТ' : '📖 ПОКАЗАТЬ ТЕКСТ'}
                </button>
            </div>
            
            ${isTextVisible ? `
                <div style="background: white; border-radius: 8px; padding: 12px 15px; margin: 10px 0; border: 2px solid #FF9800; font-family: monospace; font-size: 14px; line-height: 1.8;">
                    ${dialog.text}
                </div>
            ` : `
                <div style="background: #f0f0f0; border-radius: 8px; padding: 15px; margin: 10px 0; text-align: center; color: #999; border: 2px dashed #ccc;">
                    🔒 Текст скрыт. Нажмите "Показать текст", чтобы увидеть монолог.
                </div>
            `}
        </div>
    `;

    // ВОПРОСЫ (с уникальными ID для подсветки)
    html += `<div style="margin-bottom: 20px;">`;
    dialog.questions.forEach((q, qIndex) => {
        const selected = selectedAnswers[dialog.id]?.[qIndex];
        html += `
            <div id="question-${dialog.id}-${qIndex}" style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 12px; border: 2px solid #E0E0E0;">
                <div style="font-weight: bold; margin-bottom: 8px;">${qIndex + 1}. ${q.question}</div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
        `;
        q.options.forEach((option, oIndex) => {
            const isSelected = selected === oIndex;
            html += `
                <label style="display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: ${isSelected ? '#E3F2FD' : '#f5f5f5'}; border-radius: 6px; cursor: pointer;">
                    <input type="radio" name="q_${dialog.id}_${qIndex}" value="${oIndex}" 
                           ${isSelected ? 'checked' : ''}
                           onchange="window.selectListeningAnswer('${dialog.id}', ${qIndex}, ${oIndex})">
                    ${option}
                </label>
            `;
        });
        html += `
                </div>
            </div>
        `;
    });
    html += `</div>`;

    html += `
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="window.prevListeningDialog()" ${currentDialogIndex === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} 
                        style="padding: 8px 20px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ◀ НАЗАД
                </button>
                <button onclick="window.nextListeningDialog()" ${currentDialogIndex === total - 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                        style="padding: 8px 20px; background: #E8F0FE; border: 2px solid #D0D0D0; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ВПЕРЕД ▶
                </button>
                <button onclick="window.checkListeningAnswers()" style="padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ✅ ПРОВЕРИТЬ
                </button>
            </div>
            <div id="listeningResult" style="font-weight: bold; font-size: 14px; min-height: 24px;"></div>
        </div>
    `;

    container.innerHTML = html;
    
    setTimeout(updateButtons, 50);
    setTimeout(updateCounter, 100);
}

// ========== ВЫБОР ОТВЕТА ==========
function selectListeningAnswer(dialogId, qIndex, value) {
    if (!selectedAnswers[dialogId]) {
        selectedAnswers[dialogId] = {};
    }
    selectedAnswers[dialogId][qIndex] = value;
}

// ========== ПЕРЕКЛЮЧЕНИЕ МОНОЛОГОВ ==========
function prevListeningDialog() {
    if (isSpeaking) stopSpeaking();
    if (currentDialogIndex > 0) {
        currentDialogIndex--;
        selectedAnswers = {};
        isTextVisible = false;
        const container = document.getElementById('modeContent');
        if (container) renderDialog(container);
    }
}

function nextListeningDialog() {
    if (isSpeaking) stopSpeaking();
    if (listeningData && currentDialogIndex < listeningData.dialogs.length - 1) {
        currentDialogIndex++;
        selectedAnswers = {};
        isTextVisible = false;
        const container = document.getElementById('modeContent');
        if (container) renderDialog(container);
    }
}

// ========== ПРОВЕРКА ОТВЕТОВ (С ПОДСВЕТКОЙ) ==========
function checkListeningAnswers() {
    if (!listeningData) return;
    const dialog = listeningData.dialogs[currentDialogIndex];
    let correct = 0;
    let total = dialog.questions.length;
    let allAnswered = true;

    dialog.questions.forEach((q, qIndex) => {
        const questionDiv = document.getElementById(`question-${dialog.id}-${qIndex}`);
        if (!questionDiv) return;

        const userAnswer = selectedAnswers[dialog.id]?.[qIndex];
        const isCorrect = userAnswer !== undefined && userAnswer === q.answer;
        const isAnswered = userAnswer !== undefined;

        // Снимаем старые стили
        questionDiv.style.borderColor = '#E0E0E0';
        questionDiv.style.backgroundColor = 'white';
        const oldStatus = questionDiv.querySelector('.question-status');
        if (oldStatus) oldStatus.remove();
        const oldFeedback = questionDiv.querySelector('.question-feedback');
        if (oldFeedback) oldFeedback.remove();
        const oldHint = questionDiv.querySelector('.question-hint');
        if (oldHint) oldHint.remove();

        if (!isAnswered) {
            allAnswered = false;
            questionDiv.style.borderColor = '#FF9800';
            questionDiv.style.backgroundColor = '#FFF8E1';
            let hint = document.createElement('div');
            hint.className = 'question-hint';
            hint.style.cssText = 'margin-top: 6px; font-size: 13px; color: #FF9800; font-weight: bold;';
            hint.textContent = '⚠️ Выберите ответ!';
            questionDiv.appendChild(hint);
            return;
        }

        if (isCorrect) {
            correct++;
            questionDiv.style.borderColor = '#4CAF50';
            questionDiv.style.backgroundColor = '#E8F5E9';
            let check = document.createElement('div');
            check.className = 'question-status';
            check.style.cssText = 'margin-top: 6px; font-size: 13px; color: #4CAF50; font-weight: bold;';
            check.textContent = '✅ Правильно!';
            questionDiv.appendChild(check);
        } else {
            questionDiv.style.borderColor = '#F44336';
            questionDiv.style.backgroundColor = '#FFEBEE';
            let feedback = document.createElement('div');
            feedback.className = 'question-feedback';
            feedback.style.cssText = 'margin-top: 6px; font-size: 13px; font-weight: bold; color: #F44336;';
            const correctOption = q.options[q.answer];
            feedback.textContent = `❌ Неправильно. Правильный ответ: "${correctOption}"`;
            questionDiv.appendChild(feedback);
        }
    });

    const resultEl = document.getElementById('listeningResult');
    if (resultEl) {
        if (!allAnswered) {
            resultEl.innerHTML = `⚠️ Вы ответили не на все вопросы! (${correct}/${total})`;
            resultEl.style.color = '#FF9800';
        } else if (correct === total) {
            resultEl.innerHTML = `🎉 Все правильно! (${correct}/${total})`;
            resultEl.style.color = '#4CAF50';
        } else if (correct === 0) {
            resultEl.innerHTML = `❌ Все ответы неправильные. Попробуйте снова! (${correct}/${total})`;
            resultEl.style.color = '#F44336';
        } else {
            resultEl.innerHTML = `⚠️ Правильно: ${correct} из ${total}. Попробуйте еще раз!`;
            resultEl.style.color = '#FF9800';
        }
    }
}

// ========== ЭКСПОРТ ==========
window.renderListening = renderListening;
window.selectListeningAnswer = selectListeningAnswer;
window.prevListeningDialog = prevListeningDialog;
window.nextListeningDialog = nextListeningDialog;
window.checkListeningAnswers = checkListeningAnswers;

console.log('🎧 listeningMode.js загружен');
