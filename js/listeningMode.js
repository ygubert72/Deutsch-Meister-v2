// ====================================================================
// listeningMode.js — Аудирование (Hörverstehen) с Yandex TTS
// ====================================================================

let listeningData = null;
let currentDialogIndex = 0;
let selectedAnswers = {};
let isTextVisible = false;

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

// ========== ОЧИСТКА ТЕКСТА ОТ ИМЁН ==========
function cleanTextFromNames(text) {
    return text
        .replace(/^[A-ZÄÖÜ][a-zäöüß]*:\s*/gm, '')
        .trim()
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ========== РАЗБОР ДИАЛОГА НА РЕПЛИКИ ==========
function parseDialog(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
        const match = line.match(/^([A-ZÄÖÜ][a-zäöüß]*):\s*(.*)/);
        if (match) {
            return {
                speaker: match[1],
                text: match[2].trim()
            };
        }
        return null;
    }).filter(s => s !== null);
}

// ========== ОЗВУЧИВАНИЕ ТЕКУЩЕГО ДИАЛОГА (С РАЗНЫМИ ГОЛОСАМИ) ==========
function speakCurrentDialog() {
    if (!listeningData) {
        console.warn('⚠️ listeningData не загружен');
        return;
    }
    
    const dialogs = listeningData.dialogs;
    if (!dialogs || dialogs.length === 0) {
        console.warn('⚠️ Нет диалогов');
        return;
    }
    
    const dialog = dialogs[currentDialogIndex];
    if (!dialog) {
        console.warn('⚠️ Диалог не найден, индекс:', currentDialogIndex);
        return;
    }
    
    console.log('🎤 Озвучивание диалога:', dialog.title);
    
    const speeches = parseDialog(dialog.text);
    
    if (speeches.length === 0) {
        console.warn('⚠️ Не удалось разобрать диалог на реплики');
        return;
    }
    
    // ВОСПРОИЗВЕДЕНИЕ РЕПЛИК ПО ОЧЕРЕДИ
    let index = 0;
    
    function playNext() {
        if (index >= speeches.length) {
            console.log('✅ Озвучка диалога завершена');
            return;
        }
        
        const speech = speeches[index];
        const cleanText = cleanTextFromNames(speech.text);
        
        console.log(`🗣️ ${speech.speaker}: ${cleanText}`);
        
        // ===== ИСПОЛЬЗУЕМ YANDEX TTS С РАЗНЫМИ ГОЛОСАМИ =====
        if (typeof window.speakWithYandex === 'function' && typeof window.getVoiceForSpeaker === 'function') {
            const voice = window.getVoiceForSpeaker(speech.speaker);
            console.log(`🎤 Голос для ${speech.speaker}: ${voice}`);
            
            window.speakWithYandex(cleanText, voice)
                .then(() => {
                    index++;
                    setTimeout(playNext, 500);
                })
                .catch((error) => {
                    console.warn('⚠️ Yandex TTS ошибка, переключаемся на fallback:', error);
                    if (typeof window.speak === 'function') {
                        window.speak(cleanText);
                        index++;
                        setTimeout(playNext, 600);
                    } else {
                        index++;
                        setTimeout(playNext, 100);
                    }
                });
        } 
        // Fallback на стандартную озвучку
        else if (typeof window.speak === 'function') {
            window.speak(cleanText);
            index++;
            setTimeout(playNext, 600);
        } 
        else {
            console.warn('⚠️ Озвучка не доступна');
            index++;
            setTimeout(playNext, 100);
        }
    }
    
    playNext();
}

// Сохраняем функцию в глобальную область для доступа из HTML
window._speakDialog = speakCurrentDialog;

// ========== ОТОБРАЖЕНИЕ ДИАЛОГА ==========
function renderDialog(container) {
    if (!listeningData || !listeningData.dialogs || listeningData.dialogs.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📭 Нет диалогов для этого урока</div>';
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

    function cleanTextForDisplay(text) {
        return text
            .split('\n')
            .map(line => line.trim())
            .join('\n');
    }

    const displayText = cleanTextForDisplay(dialog.text);

    let html = `
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <h4 style="margin: 0;">🎧 ${dialog.title}</h4>
                <span style="font-size: 14px; color: #888;">${currentDialogIndex + 1} / ${total}</span>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0;">
                <button onclick="window._speakDialog()" style="padding: 8px 20px; background: #3B6FE0; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🔊 ПРОСЛУШАТЬ
                </button>
                <button onclick="window._toggleText()" style="padding: 8px 20px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ${isTextVisible ? '🙈 СКРЫТЬ ТЕКСТ' : '📖 ПОКАЗАТЬ ТЕКСТ'}
                </button>
            </div>
            
            ${isTextVisible ? `
                <div style="background: white; border-radius: 8px; padding: 12px 15px; margin: 10px 0; border: 2px solid #FF9800;">
                    ${displayText.split('\n').map(line => `
                        <div style="font-family: monospace; font-size: 14px; line-height: 1.8; padding: 0; margin: 0; ${line.trim() === '' ? 'height: 6px;' : ''}">
                            ${line || '&nbsp;'}
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="background: #f0f0f0; border-radius: 8px; padding: 15px; margin: 10px 0; text-align: center; color: #999; border: 2px dashed #ccc;">
                    🔒 Текст скрыт. Нажмите "Показать текст", чтобы увидеть диалог.
                </div>
            `}
        </div>
    `;

    // ВОПРОСЫ (всегда видны)
    html += `<div style="margin-bottom: 20px;">`;
    dialog.questions.forEach((q, qIndex) => {
        const selected = selectedAnswers[dialog.id]?.[qIndex];
        html += `
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 12px; border: 2px solid #E0E0E0;">
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
    
    setTimeout(updateCounter, 100);
}

// ========== ВЫБОР ОТВЕТА ==========
function selectListeningAnswer(dialogId, qIndex, value) {
    if (!selectedAnswers[dialogId]) {
        selectedAnswers[dialogId] = {};
    }
    selectedAnswers[dialogId][qIndex] = value;
}

// ========== ПЕРЕКЛЮЧЕНИЕ ДИАЛОГОВ ==========
function prevListeningDialog() {
    if (currentDialogIndex > 0) {
        currentDialogIndex--;
        selectedAnswers = {};
        isTextVisible = false;
        const container = document.getElementById('modeContent');
        if (container) renderDialog(container);
    }
}

function nextListeningDialog() {
    if (listeningData && currentDialogIndex < listeningData.dialogs.length - 1) {
        currentDialogIndex++;
        selectedAnswers = {};
        isTextVisible = false;
        const container = document.getElementById('modeContent');
        if (container) renderDialog(container);
    }
}

// ========== ПРОВЕРКА ОТВЕТОВ ==========
function checkListeningAnswers() {
    if (!listeningData) return;
    const dialog = listeningData.dialogs[currentDialogIndex];
    let correct = 0;
    const total = dialog.questions.length;

    dialog.questions.forEach((q, qIndex) => {
        const userAnswer = selectedAnswers[dialog.id]?.[qIndex];
        if (userAnswer !== undefined && userAnswer === q.answer) {
            correct++;
        }
    });

    const resultEl = document.getElementById('listeningResult');
    if (resultEl) {
        if (correct === total) {
            resultEl.innerHTML = `🎉 Все правильно! (${correct}/${total})`;
            resultEl.style.color = '#4CAF50';
        } else if (correct === 0) {
            resultEl.innerHTML = `❌ Ни одного правильного ответа. Попробуйте снова! (${correct}/${total})`;
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
