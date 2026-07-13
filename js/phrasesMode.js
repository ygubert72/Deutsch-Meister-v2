// ============================================================
// phrasesMode.js — Фразы (все фразы уровня из trainer)
// ============================================================

let phrasesList = [];
let phrasesIndex = 0;
let phrasesLevel = 'A1';
let phrasesDirection = 'ru_to_de';
let phrasesStudied = {};
let phrasesContainer = {};
const PHRASES_STUDIED_KEY = 'dm_phrases_studied';
const PHRASES_CONTAINER_KEY = 'dm_phrases_container';

// ========== ЗАГРУЗКА ПРОГРЕССА ==========
function loadPhrasesProgress(level) {
    try {
        const studied = localStorage.getItem(PHRASES_STUDIED_KEY + '_' + level);
        if (studied) phrasesStudied = JSON.parse(studied);
        else phrasesStudied = {};
        
        const container = localStorage.getItem(PHRASES_CONTAINER_KEY + '_' + level);
        if (container) phrasesContainer = JSON.parse(container);
        else phrasesContainer = {};
    } catch(e) {
        phrasesStudied = {};
        phrasesContainer = {};
    }
}

function savePhrasesProgress(level) {
    try {
        localStorage.setItem(PHRASES_STUDIED_KEY + '_' + level, JSON.stringify(phrasesStudied));
        localStorage.setItem(PHRASES_CONTAINER_KEY + '_' + level, JSON.stringify(phrasesContainer));
    } catch(e) {}
}

// ========== ЗАГРУЗКА ВСЕХ ФРАЗ УРОВНЯ ==========
async function loadAllPhrasesForLevel(level) {
    try {
        const indexResponse = await fetch(`docs/${level}/index.json`);
        const indexData = await indexResponse.json();
        
        let allPhrases = [];
        const seen = new Set();
        
        for (const lesson of indexData.lessons) {
            const lessonFile = `docs/${level}/lessons/lesson_${String(lesson.id).padStart(2, '0')}.json`;
            try {
                const response = await fetch(lessonFile);
                if (response.ok) {
                    const data = await response.json();
                    if (data.trainer) {
                        for (const phrase of data.trainer) {
                            const key = phrase.de + '|' + phrase.ru;
                            if (!seen.has(key)) {
                                seen.add(key);
                                allPhrases.push(phrase);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        
        return allPhrases;
    } catch(e) {
        console.error('Ошибка загрузки фраз уровня:', e);
        return [];
    }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
async function renderPhrases(container, level) {
    phrasesLevel = level;
    loadPhrasesProgress(level);
    
    const allPhrases = await loadAllPhrasesForLevel(level);
    if (!allPhrases || allPhrases.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#999;">
                <div style="font-size:48px;margin-bottom:15px;">📭</div>
                <div>Нет фраз для уровня ${level}</div>
            </div>
        `;
        return;
    }
    
    phrasesList = allPhrases.filter(p => {
        const key = p.de + '|' + p.ru;
        return !phrasesStudied[key] && !phrasesContainer[key];
    });
    
    if (phrasesList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:15px;">🎉</div>
                <div style="font-size:20px;margin-bottom:10px;">Все фразы уровня изучены!</div>
                <div style="font-size:14px;color:#888;">
                    ${Object.keys(phrasesStudied).length} фраз в контейнере
                </div>
                <button onclick="resetPhrases('${level}')" style="margin-top:15px;padding:10px 25px;background:#FF9800;color:white;border:none;border-radius:8px;cursor:pointer;">
                    🔄 Сбросить прогресс
                </button>
                <button onclick="showPhrasesContainer('${level}')" style="margin-top:15px;padding:10px 25px;background:#3B6FE0;color:white;border:none;border-radius:8px;cursor:pointer;margin-left:10px;">
                    📦 Контейнер
                </button>
            </div>
        `;
        return;
    }
    
    phrasesIndex = 0;
    showPhrase(container);
}

// ========== ПОКАЗ ФРАЗЫ ==========
function showPhrase(container) {
    if (phrasesIndex >= phrasesList.length) {
        phrasesIndex = 0;
        renderPhrases(container, phrasesLevel);
        return;
    }
    
    const phrase = phrasesList[phrasesIndex];
    const isRuToDe = phrasesDirection === 'ru_to_de';
    const question = isRuToDe ? phrase.ru : phrase.de;
    const correctAnswer = isRuToDe ? phrase.de : phrase.ru;
    
    const allPhrases = [...phrasesList];
    const otherPhrases = allPhrases.filter(p => p.de !== phrase.de);
    const shuffled = [...otherPhrases];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const options = [phrase, ...shuffled.slice(0, 3)];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    
    const total = phrasesList.length;
    const studiedCount = Object.keys(phrasesStudied).length;
    const containerCount = Object.keys(phrasesContainer).length;
    
    let html = `
        <div style="text-align:center;padding:10px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;max-width:550px;margin:0 auto 10px auto;">
                <button onclick="showPhrasesContainer('${phrasesLevel}')" style="padding:5px 12px;background:#FF9800;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">📦 КОНТЕЙНЕР (${containerCount})</button>
                <button onclick="switchPhrasesDirection()" style="padding:5px 12px;background:#3B6FE0;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">
                    ${phrasesDirection === 'ru_to_de' ? 'Ru → De' : 'De → Ru'}
                </button>
            </div>
            
            <div style="font-size:13px;color:#888;margin-bottom:5px;">
                🗣️ Фразы ${phrasesLevel} · ${studiedCount + containerCount} изучено из ${total + studiedCount + containerCount}
            </div>
            
            <div style="background:#FFFFFF;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,0.1);max-width:550px;margin:10px auto;min-height:150px;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;">
                <div style="font-size:28px;font-weight:bold;color:#1A1A1A;">${question}</div>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:550px;margin:15px auto;">
                ${options.map(opt => `
                    <button class="phrase-option" data-phrase="${opt.de}" style="
                        padding:14px;
                        background:#FFFFFF;
                        border:2px solid #D0D0D0;
                        border-radius:12px;
                        cursor:pointer;
                        font-size:15px;
                        transition:all 0.1s;
                        font-family:inherit;
                    ">${isRuToDe ? opt.de : opt.ru}</button>
                `).join('')}
            </div>
            
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0;">
                <button id="phrasesStudyBtn" style="padding:8px 16px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">✅ ИЗУЧЕНО</button>
                <button id="phrasesContainerBtn" style="padding:8px 16px;background:#FF9800;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">📦 В КОНТЕЙНЕР</button>
                <button id="phrasesPrevBtn" style="padding:8px 16px;background:#E8F0FE;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">◀</button>
                <button id="phrasesNextBtn" style="padding:8px 16px;background:#E8F0FE;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">▶</button>
                <button id="phrasesResetBtn" style="padding:8px 16px;background:#E8F0FE;border:2px solid #D0D0D0;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">⏮ В НАЧАЛО</button>
            </div>
            
            <div style="font-size:13px;color:#888;margin-top:5px;">
                ${phrasesIndex + 1} / ${phrasesList.length}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    document.querySelectorAll('.phrase-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const selectedPhrase = this.dataset.phrase;
            const isCorrect = selectedPhrase === phrase.de;
            
            if (isCorrect) {
                this.style.background = '#C8E6C9';
                this.style.borderColor = '#4CAF50';
                setTimeout(() => {
                    phrasesIndex++;
                    showPhrase(container);
                }, 400);
            } else {
                this.style.background = '#FFCDD2';
                this.style.borderColor = '#F44336';
                setTimeout(() => {
                    this.style.background = '#FFFFFF';
                    this.style.borderColor = '#D0D0D0';
                }, 500);
            }
        });
    });
    
    document.getElementById('phrasesStudyBtn').addEventListener('click', function() {
        const key = phrase.de + '|' + phrase.ru;
        phrasesStudied[key] = true;
        savePhrasesProgress(phrasesLevel);
        phrasesList = phrasesList.filter(p => (p.de + '|' + p.ru) !== key);
        if (phrasesList.length === 0) {
            renderPhrases(container, phrasesLevel);
        } else {
            if (phrasesIndex >= phrasesList.length) phrasesIndex = 0;
            showPhrase(container);
        }
    });
    
    document.getElementById('phrasesContainerBtn').addEventListener('click', function() {
        const key = phrase.de + '|' + phrase.ru;
        phrasesContainer[key] = true;
        savePhrasesProgress(phrasesLevel);
        phrasesList = phrasesList.filter(p => (p.de + '|' + p.ru) !== key);
        if (phrasesList.length === 0) {
            renderPhrases(container, phrasesLevel);
        } else {
            if (phrasesIndex >= phrasesList.length) phrasesIndex = 0;
            showPhrase(container);
        }
    });
    
    document.getElementById('phrasesPrevBtn').addEventListener('click', function() {
        if (phrasesIndex > 0) {
            phrasesIndex--;
            showPhrase(container);
        }
    });
    
    document.getElementById('phrasesNextBtn').addEventListener('click', function() {
        if (phrasesIndex < phrasesList.length - 1) {
            phrasesIndex++;
            showPhrase(container);
        }
    });
    
    document.getElementById('phrasesResetBtn').addEventListener('click', function() {
        if (phrasesList.length > 0) {
            phrasesIndex = 0;
            showPhrase(container);
        }
    });
}

// ========== ПЕРЕКЛЮЧЕНИЕ НАПРАВЛЕНИЯ ==========
function switchPhrasesDirection() {
    phrasesDirection = phrasesDirection === 'ru_to_de' ? 'de_to_ru' : 'ru_to_de';
    const container = document.getElementById('modeContent');
    if (container && phrasesList.length > 0) {
        showPhrase(container);
    }
}

// ========== ПОКАЗ КОНТЕЙНЕРА ==========
function showPhrasesContainer(level) {
    const items = Object.keys(phrasesContainer);
    if (items.length === 0) {
        alert('📦 Контейнер фраз пуст');
        return;
    }
    
    let text = '📦 КОНТЕЙНЕР ФРАЗ (' + items.length + ' фраз):\n\n';
    loadAllPhrasesForLevel(level).then(allPhrases => {
        items.forEach(key => {
            const phrase = allPhrases.find(p => (p.de + '|' + p.ru) === key);
            if (phrase) {
                text += phrase.de + ' — ' + phrase.ru + '\n';
            }
        });
        alert(text);
    });
}

// ========== СБРОС ПРОГРЕССА ==========
function resetPhrases(level) {
    if (!confirm(`Сбросить весь прогресс Фраз для уровня ${level}?`)) return;
    localStorage.removeItem(PHRASES_STUDIED_KEY + '_' + level);
    localStorage.removeItem(PHRASES_CONTAINER_KEY + '_' + level);
    phrasesStudied = {};
    phrasesContainer = {};
    const container = document.getElementById('modeContent');
    renderPhrases(container, level);
}

// Экспорт
window.renderPhrases = renderPhrases;
window.resetPhrases = resetPhrases;
window.switchPhrasesDirection = switchPhrasesDirection;
window.showPhrasesContainer = showPhrasesContainer;
